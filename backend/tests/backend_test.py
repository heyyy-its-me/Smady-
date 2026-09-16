"""Smady backend API tests: auth (JWT httpOnly cookies), ICP, Leads, Outreach, Dashboard."""
import os
import re
import uuid
import time
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

backend_env = dotenv_values("/app/backend/.env")
CALLBACK_SECRET = backend_env.get("N8N_CALLBACK_SECRET")

EXISTING_EMAIL = "testuser@example.com"
EXISTING_PASSWORD = "password123"


def new_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def login(session, email=EXISTING_EMAIL, password=EXISTING_PASSWORD):
    r = session.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed {r.status_code} {r.text[:300]}"
    return r


# ---------------- Auth module ----------------
class TestAuth:
    def test_health(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json()["message"] == "Smady API"

    def test_login_success_sets_httponly_cookies(self):
        s = new_client()
        r = login(s)
        data = r.json()
        assert data["email"] == EXISTING_EMAIL
        assert data["name"]
        assert data["plan"]
        assert isinstance(data["id"], str)
        raw = r.headers.get("set-cookie", "")
        assert "access_token" in raw and "refresh_token" in raw, raw
        assert "HttpOnly" in raw, raw
        assert "SameSite=none" in raw.lower() or "samesite=none" in raw.lower(), raw
        assert "Secure" in raw, raw

    def test_me_with_cookie_session(self):
        s = new_client()
        login(s)
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == EXISTING_EMAIL

    def test_me_unauthenticated_401(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_refresh_and_logout(self):
        s = new_client()
        login(s)
        r = s.post(f"{API}/auth/refresh")
        assert r.status_code == 200
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        s2 = new_client()
        s2.cookies.update({})
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401, "session should be cleared after logout"

    def test_signup_and_duplicate(self):
        s = new_client()
        email = f"TEST_signup_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/signup", json={
            "fullName": "TEST Signup", "email": email, "company": "TEST Co", "password": "password123"})
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["email"] == email.lower()
        assert d["name"] == "TEST Signup"
        assert d["company"] == "TEST Co"
        # session established
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200 and me.json()["email"] == email.lower()
        # duplicate
        r2 = new_client().post(f"{API}/auth/signup", json={
            "fullName": "x", "email": email, "company": "y", "password": "password123"})
        assert r2.status_code == 409, r2.status_code

    def test_signup_short_password(self):
        r = requests.post(f"{API}/auth/signup", json={
            "fullName": "x", "email": f"TEST_short_{uuid.uuid4().hex[:6]}@example.com",
            "company": "y", "password": "123"})
        assert r.status_code == 400

    def test_signup_invalid_email_422(self):
        r = requests.post(f"{API}/auth/signup", json={
            "fullName": "x", "email": "not-an-email", "company": "y", "password": "password123"})
        assert r.status_code == 422

    def test_bcrypt_hash_format(self):
        import subprocess
        out = subprocess.run(
            ["psql", "-h", backend_env["DB_HOST"], "-U", backend_env["DB_USER"], "-d", backend_env["PG_DATABASE"],
             "-t", "-A", "-c", f"select password_hash from {backend_env['DB_SCHEMA']}.users limit 1;"],
            capture_output=True, text=True, env={**os.environ, "PGPASSWORD": backend_env["DB_PASSWORD"]})
        assert out.returncode == 0, out.stderr[:300]
        h = out.stdout.strip()
        assert h.startswith("$2b$"), f"unexpected hash prefix: {h[:10]}"


class TestBruteForce:
    """Brute force lockout: 5 failed attempts -> 429. Uses a dedicated email so other tests are unaffected."""

    def test_wrong_password_then_lockout(self):
        s = new_client()
        email = f"TEST_lock_{uuid.uuid4().hex[:8]}@example.com"
        # register so the account exists
        r = s.post(f"{API}/auth/signup", json={
            "fullName": "TEST Lock", "email": email, "company": "c", "password": "password123"})
        assert r.status_code == 200
        codes = []
        for _ in range(6):
            rr = new_client().post(f"{API}/auth/login", json={"email": email, "password": "wrongpass"})
            codes.append(rr.status_code)
        assert codes[0] == 401, codes
        # KNOWN BUG: identifier = f"{request.client.host}:{email}" and request.client.host is the
        # k8s ingress pod IP which rotates between several pods, so the 5-attempt counter is split
        # across identifiers and lockout does not trigger at 5 real attempts.
        assert 429 in codes, f"expected 429 lockout within 6 attempts, got {codes}"


# ---------------- ICP module ----------------
class TestICP:
    @pytest.fixture(scope="class")
    def client(self):
        s = new_client()
        login(s)
        return s

    def test_generate_returns_webhook_not_configured(self, client):
        r = client.post(f"{API}/icp/generate", json={
            "productName": "TEST Product", "productDescription": "desc", "companyName": "TEST Co",
            "companyDetails": "details", "countries": ["USA"], "industries": ["SaaS"]})
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["status"] == "webhook_not_configured"
        assert uuid.UUID(d["request_id"])
        TestICP.request_id = d["request_id"]

    def test_status_pending_state(self, client):
        r = client.get(f"{API}/icp/status/{TestICP.request_id}")
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "webhook_not_configured"
        assert d["input"]["productName"] == "TEST Product"
        assert d["result"] is None

    def test_callback_rejects_bad_secret(self, client):
        r = requests.post(f"{API}/icp/callback", json={"request_id": TestICP.request_id, "status": "completed"},
                          headers={"X-Callback-Secret": "wrong"})
        assert r.status_code == 401

    def test_callback_and_completed_status(self, client):
        payload = {
            "request_id": TestICP.request_id, "status": "completed",
            "result": {"industry": ["SaaS"], "targetRoles": ["CTO"], "companySize": ["50-200"],
                       "geography": ["USA"], "painPoints": ["manual work"]}}
        r = requests.post(f"{API}/icp/callback", json=payload, headers={"X-Callback-Secret": CALLBACK_SECRET})
        assert r.status_code == 200, r.text[:300]
        r2 = client.get(f"{API}/icp/status/{TestICP.request_id}")
        assert r2.status_code == 200
        d = r2.json()
        assert d["status"] == "completed"
        assert d["result"]["targetRoles"] == ["CTO"]
        assert d["result"]["painPoints"] == ["manual work"]

    def test_latest_reflects_stored_icp(self, client):
        r = client.get(f"{API}/icp/latest")
        assert r.status_code == 200
        d = r.json()
        assert d is not None
        assert d["request_id"] == TestICP.request_id

    def test_status_unknown_id_404(self, client):
        r = client.get(f"{API}/icp/status/{uuid.uuid4()}")
        assert r.status_code == 404

    def test_generate_requires_auth(self):
        r = requests.post(f"{API}/icp/generate", json={
            "productName": "a", "productDescription": "b", "companyName": "c", "companyDetails": "d"})
        assert r.status_code == 401


# ---------------- Leads module ----------------
class TestLeads:
    @pytest.fixture(scope="class")
    def client(self):
        s = new_client()
        login(s)
        return s

    def test_generate_webhook_not_configured(self, client):
        r = client.post(f"{API}/leads/generate", json={
            "industries": ["SaaS"], "roles": ["CTO"], "countries": ["USA"], "cities": ["NYC"], "companySize": "50-200"})
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["status"] == "webhook_not_configured"
        TestLeads.request_id = d["request_id"]

    def test_status(self, client):
        r = client.get(f"{API}/leads/status/{TestLeads.request_id}")
        assert r.status_code == 200
        assert r.json()["status"] == "webhook_not_configured"

    def test_callback_inserts_leads(self, client):
        unique = uuid.uuid4().hex[:6]
        body = {"request_id": TestLeads.request_id, "status": "completed", "leads": [
            {"name": f"TEST Lead {unique}", "title": "CTO", "company": "TEST Corp", "domain": "test.com",
             "email": f"lead{unique}@test.com", "linkedin": "https://li/x", "status": "New", "source": "Agent",
             "about": "about", "assigned": [], "sequenceProgress": 0}]}
        r = requests.post(f"{API}/leads/callback", json=body, headers={"X-Callback-Secret": CALLBACK_SECRET})
        assert r.status_code == 200, r.text[:300]
        r2 = client.get(f"{API}/leads/status/{TestLeads.request_id}")
        assert r2.json()["status"] == "completed"
        r3 = client.get(f"{API}/leads")
        assert r3.status_code == 200
        names = [x["name"] for x in r3.json()]
        assert f"TEST Lead {unique}" in names
        TestLeads.lead_name = f"TEST Lead {unique}"

    def test_callback_bad_secret(self, client):
        r = requests.post(f"{API}/leads/callback", json={"request_id": TestLeads.request_id, "status": "completed", "leads": []},
                          headers={"X-Callback-Secret": "nope"})
        assert r.status_code == 401

    def test_upload_leads_persist(self, client):
        before = len(client.get(f"{API}/leads").json())
        r = client.post(f"{API}/leads/upload", json={"count": 3})
        assert r.status_code == 200, r.text[:300]
        inserted = r.json()
        assert len(inserted) == 3
        assert all(x["source"] == "Uploaded" for x in inserted)
        after = client.get(f"{API}/leads").json()
        assert len(after) == before + 3
        ids = {x["id"] for x in after}
        assert {x["id"] for x in inserted}.issubset(ids)
        TestLeads.uploaded_ids = [x["id"] for x in inserted]

    def test_send_to_outreach_updates_status(self, client):
        ids = TestLeads.uploaded_ids[:2]
        r = client.post(f"{API}/leads/send-to-outreach", json={"ids": ids})
        assert r.status_code == 200, r.text[:300]
        rows = {x["id"]: x for x in client.get(f"{API}/leads").json()}
        for i in ids:
            assert rows[i]["status"] == "Contacted", rows[i]

    def test_leads_requires_auth(self):
        assert requests.get(f"{API}/leads").status_code == 401


# ---------------- Outreach module ----------------
class TestOutreach:
    @pytest.fixture(scope="class")
    def client(self):
        s = new_client()
        login(s)
        return s

    def test_create_campaign_failed_when_webhook_missing(self, client):
        lead_count = len([x for x in client.get(f"{API}/leads").json()
                          if x["status"] in ("New", "Verified", "Contacted")])
        name = f"TEST Campaign {uuid.uuid4().hex[:6]}"
        r = client.post(f"{API}/outreach/campaigns", json={
            "name": name, "subject": "TEST subject", "body": "TEST body", "recipientSource": "all"})
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["status"] == "Failed", d
        assert d["name"] == name
        assert d["leadsCount"] == lead_count, f"expected {lead_count} got {d['leadsCount']}"
        assert d["requestId"].startswith("#")
        TestOutreach.campaign_id = d["id"]
        TestOutreach.campaign_name = name

    def test_campaign_listed(self, client):
        rows = client.get(f"{API}/outreach/campaigns").json()
        assert any(r["id"] == TestOutreach.campaign_id for r in rows)

    def test_callback_records_events_and_stats(self, client):
        # need the raw request_id uuid -> query db
        import subprocess
        out = subprocess.run(
            ["psql", "-h", backend_env["DB_HOST"], "-U", backend_env["DB_USER"], "-d", backend_env["PG_DATABASE"],
             "-t", "-A", "-c",
             f"select request_id from {backend_env['DB_SCHEMA']}.outreach_campaigns where id='{TestOutreach.campaign_id}';"],
            capture_output=True, text=True, env={**os.environ, "PGPASSWORD": backend_env["DB_PASSWORD"]})
        assert out.returncode == 0, out.stderr[:300]
        request_id = out.stdout.strip()
        assert request_id

        before = client.get(f"{API}/outreach/stats").json()
        body = {"request_id": request_id, "status": "Sent", "emails": [
            {"email": "a@test.com", "status": "sent"},
            {"email": "b@test.com", "status": "sent"},
            {"email": "c@test.com", "status": "opened"},
            {"email": "d@test.com", "status": "replied"},
            {"email": "e@test.com", "status": "bounced"},
        ]}
        r = requests.post(f"{API}/outreach/callback", json=body, headers={"X-Callback-Secret": CALLBACK_SECRET})
        assert r.status_code == 200, r.text[:300]

        after = client.get(f"{API}/outreach/stats").json()
        assert after["emailsSent"]["value"] == before["emailsSent"]["value"] + 2
        assert after["openRate"]["value"] > 0
        assert after["replyRate"]["value"] > 0
        assert after["bounceRate"]["value"] > 0
        assert len(after["weeklyEmailsSent"]) == 7
        # campaign status updated
        rows = client.get(f"{API}/outreach/campaigns").json()
        camp = [x for x in rows if x["id"] == TestOutreach.campaign_id][0]
        assert camp["status"] == "Sent", camp

    def test_callback_bad_secret(self):
        r = requests.post(f"{API}/outreach/callback", json={"request_id": str(uuid.uuid4()), "status": "Sent", "emails": []},
                          headers={"X-Callback-Secret": "bad"})
        assert r.status_code == 401

    def test_stats_requires_auth(self):
        assert requests.get(f"{API}/outreach/stats").status_code == 401


# ---------------- Dashboard module ----------------
class TestDashboard:
    @pytest.fixture(scope="class")
    def client(self):
        s = new_client()
        login(s)
        return s

    def test_stats_shape_and_real_data(self, client):
        r = client.get(f"{API}/dashboard/stats")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        for key in ["leadsToday", "totalLeads", "emailsSent", "meetingsBooked"]:
            assert key in d and isinstance(d[key]["value"], int)
            assert len(d[key]["sparkline"]) == 7
        real_leads = len(client.get(f"{API}/leads").json())
        assert d["totalLeads"]["value"] == real_leads, "totalLeads must match real DB lead count"
        assert d["totalLeads"]["value"] != 3260, "still showing mock value"
        assert len(d["leadsGrowth"]) == 12
        assert len(d["pipelineFunnel"]) == 4
        assert isinstance(d["leadSourceBreakdown"], list)
        assert isinstance(d["activityFeed"], list)
        assert "emailsSentComparison" in d and "replyRateComparison" in d

    def test_funnel_matches_lead_statuses(self, client):
        d = client.get(f"{API}/dashboard/stats").json()
        rows = client.get(f"{API}/leads").json()
        contacted = len([x for x in rows if x["status"] == "Contacted"])
        funnel = {f["stage"]: f["value"] for f in d["pipelineFunnel"]}
        assert funnel["Contacted"] == contacted

    def test_requires_auth(self):
        assert requests.get(f"{API}/dashboard/stats").status_code == 401


# ---------------- Data isolation ----------------
class TestIsolation:
    def test_second_user_sees_no_data_of_first(self):
        s = new_client()
        email = f"TEST_iso_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/signup", json={
            "fullName": "TEST Iso", "email": email, "company": "Iso Co", "password": "password123"})
        assert r.status_code == 200
        assert s.get(f"{API}/leads").json() == []
        assert s.get(f"{API}/outreach/campaigns").json() == []
        assert s.get(f"{API}/icp/latest").json() is None
        stats = s.get(f"{API}/dashboard/stats").json()
        assert stats["totalLeads"]["value"] == 0
        assert stats["emailsSent"]["value"] == 0
        ostats = s.get(f"{API}/outreach/stats").json()
        assert ostats["emailsSent"]["value"] == 0

    def test_cannot_read_other_users_icp_status(self):
        owner = new_client()
        login(owner)
        rid = owner.post(f"{API}/icp/generate", json={
            "productName": "TEST Iso P", "productDescription": "d", "companyName": "c",
            "companyDetails": "cd"}).json()["request_id"]
        other = new_client()
        email = f"TEST_iso2_{uuid.uuid4().hex[:8]}@example.com"
        other.post(f"{API}/auth/signup", json={
            "fullName": "TEST Iso2", "email": email, "company": "c", "password": "password123"})
        r = other.get(f"{API}/icp/status/{rid}")
        assert r.status_code == 404, r.status_code

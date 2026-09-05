"""Phase 5 (Meetings), Phase 6 (Proposals), Reports history, real ICP engine, tenant isolation.

Rewritten for the CURRENT state of the app:
  - webhooks (leads/outreach/meetings/proposals) ARE configured -> status 'pending'/'Queued'
  - verify_callback_secret is non-blocking (log-only)
  - ICP is SYNCHRONOUS via ICP_ENGINE_API_URL (rich response shape)
  - DB is real AWS RDS Postgres, schema 'smady'
"""
import os
import uuid
from datetime import datetime, timedelta

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
    if r.status_code != 200:
        pytest.fail(f"login failed {r.status_code} {r.text[:300]}")
    return r.json()


def signup(session, prefix="iso"):
    email = f"TEST_{prefix}_{uuid.uuid4().hex[:8]}@example.com"
    r = session.post(f"{API}/auth/signup", json={
        "fullName": "TEST User", "email": email, "company": "TEST Co", "password": "password123"})
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    data["email"] = email
    return data


def cb(path, payload, secret=CALLBACK_SECRET):
    headers = {"Content-Type": "application/json"}
    if secret is not None:
        headers["X-Callback-Secret"] = secret
    return requests.post(f"{API}{path}", json=payload, headers=headers)


def future_date(days=3):
    return (datetime.utcnow() + timedelta(days=days)).date().isoformat()


# ---------------- Auth regression ----------------
class TestAuthRegression:
    def test_login_and_me(self):
        s = new_client()
        me = login(s)
        assert me.get("email") == EXISTING_EMAIL
        assert isinstance(me.get("id"), str) and len(me["id"]) > 10
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200, r.text[:300]
        assert r.json()["email"] == EXISTING_EMAIL

    def test_login_bad_password_401(self):
        s = new_client()
        r = s.post(f"{API}/auth/login", json={"email": EXISTING_EMAIL, "password": "wrongpass!!"})
        assert r.status_code == 401, r.status_code

    def test_me_requires_auth(self):
        assert requests.get(f"{API}/auth/me").status_code == 401

    def test_logout_clears_session(self):
        s = new_client()
        login(s)
        assert s.post(f"{API}/auth/logout").status_code == 200
        assert s.get(f"{API}/auth/me").status_code == 401


# ---------------- ICP engine (real, synchronous) ----------------
class TestICPRealEngine:
    @pytest.fixture(scope="class")
    def client(self):
        s = new_client()
        login(s)
        return s

    def test_generate_returns_rich_result_synchronously(self, client):
        r = client.post(f"{API}/icp/generate", json={
            "productName": "TEST Smady CRM",
            "productDescription": "An AI powered B2B sales automation platform that sources leads, "
                                  "runs email outreach, books meetings and generates proposals.",
            "companyName": "TEST Acme",
            "targetGeography": "India, United States",
            "businessStage": "Growth",
            "priority": "Revenue Growth",
        }, timeout=120)
        assert r.status_code == 200, f"{r.status_code} {r.text[:600]}"
        d = r.json()
        assert d["status"] == "completed", d
        result = d.get("result")
        assert isinstance(result, dict) and result, "ICP engine returned empty result"
        # New rich shape assertions
        keys = set(result.keys())
        for k in ["analysis", "gtm_strategy", "primary_icp", "secondary_icps",
                  "buyer_persona", "confidence_score"]:
            assert k in keys, f"missing {k}; got {sorted(keys)}"
        # exact fields the frontend (ICPEngine.tsx / types/index.ts) dereferences
        assert result["analysis"]["positioning"]
        assert result["analysis"]["differentiator"]
        assert isinstance(result["analysis"]["industries"], list)
        assert isinstance(result["gtm_strategy"]["target_countries"], list)
        assert isinstance(result["gtm_strategy"]["recommended_channels"], list)
        for k in ["role", "pain_points", "goals"]:
            assert isinstance(result["buyer_persona"][k], list), k
        primary = result["primary_icp"]
        for k in ["icp", "pain_severity", "market_size", "ease_of_sales", "score"]:
            assert k in primary, f"primary_icp missing {k}"
        assert isinstance(result["secondary_icps"], list)
        assert 0 <= result["confidence_score"] <= 1, \
            f"frontend multiplies confidence_score by 100; got {result['confidence_score']}"
        # Old flat mock shape must be gone
        assert "targetRoles" not in keys and "companySize" not in keys, "old flat mock ICP shape returned"
        TestICPRealEngine.request_id = d["request_id"]

    def test_status_persisted_completed(self, client):
        rid = getattr(TestICPRealEngine, "request_id", None)
        assert rid, "previous test did not produce a request_id"
        r = client.get(f"{API}/icp/status/{rid}")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["status"] == "completed"
        assert d["result"] and "primary_icp" in d["result"]
        assert d["input"]["product_name"] == "TEST Smady CRM"
        assert "_id" not in d

    def test_latest_returns_the_completed_profile(self, client):
        r = client.get(f"{API}/icp/latest")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d is not None
        assert d["status"] in ("completed", "pending", "failed")

    def test_generate_validation_missing_fields_422(self, client):
        r = client.post(f"{API}/icp/generate", json={"productName": "x"})
        assert r.status_code == 422, r.status_code

    def test_requires_auth(self):
        assert requests.get(f"{API}/icp/latest").status_code == 401


# ---------------- Leads (real n8n webhook trigger) ----------------
class TestLeadsTrigger:
    @pytest.fixture(scope="class")
    def client(self):
        s = new_client()
        login(s)
        return s

    def test_generate_returns_pending_and_persists_run(self, client):
        r = client.post(f"{API}/leads/generate", json={
            "industries": ["SaaS"], "roles": ["CTO"], "countries": ["India"],
            "cities": ["Bengaluru"], "companySize": "51-200"}, timeout=60)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert d["status"] == "pending", f"webhook configured but status is {d['status']}"
        rid = d["request_id"]
        st = client.get(f"{API}/leads/status/{rid}")
        assert st.status_code == 200, st.text[:300]
        assert st.json()["status"] == "pending"
        TestLeadsTrigger.request_id = rid

    def test_list_leads_filtered_by_request_id(self, client):
        rid = getattr(TestLeadsTrigger, "request_id", None)
        assert rid
        r = client.get(f"{API}/leads?request_id={rid}")
        assert r.status_code == 200, r.text[:300]
        assert isinstance(r.json(), list)

    def test_list_leads_unknown_request_id_404(self, client):
        r = client.get(f"{API}/leads?request_id={uuid.uuid4()}")
        assert r.status_code == 404, r.status_code

    def test_callback_inserts_leads_and_completes_run(self, client):
        rid = client.post(f"{API}/leads/generate", json={
            "industries": ["Fintech"], "countries": ["US"]}).json()["request_id"]
        r = cb("/leads/callback", {"request_id": rid, "status": "completed", "leads": [{
            "name": "TEST CB Lead", "title": "VP Sales", "company": "TEST CBCorp",
            "domain": "cbcorp.test", "email": "cb@cbcorp.test", "linkedin": "https://li/cb",
            "status": "New", "source": "Agent", "about": "TEST"}]})
        assert r.status_code == 200, r.text[:400]
        rows = client.get(f"{API}/leads?request_id={rid}").json()
        assert len(rows) == 1, rows
        assert rows[0]["name"] == "TEST CB Lead"
        assert rows[0]["email"] == "cb@cbcorp.test"
        assert client.get(f"{API}/leads/status/{rid}").json()["status"] == "completed"

    def test_callback_without_secret_allowed_nonblocking(self, client):
        rid = client.post(f"{API}/leads/generate", json={"industries": ["X"]}).json()["request_id"]
        r = cb("/leads/callback", {"request_id": rid, "status": "completed", "leads": []}, secret=None)
        assert r.status_code == 200, f"callback secret should be non-blocking now: {r.status_code} {r.text[:200]}"

    def test_requires_auth(self):
        assert requests.get(f"{API}/leads").status_code == 401


# ---------------- Outreach (Queued now that webhook is configured) ----------------
class TestOutreach:
    @pytest.fixture(scope="class")
    def client(self):
        s = new_client()
        login(s)
        return s

    def test_create_campaign_is_queued_with_real_lead_count(self, client):
        leads = client.get(f"{API}/leads").json()
        expected = len([l for l in leads if l["status"] in ("New", "Verified", "Contacted")])
        r = client.post(f"{API}/outreach/campaigns", json={
            "name": "TEST Campaign Real", "subject": "TEST subj", "body": "TEST body"}, timeout=60)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert d["status"] == "Queued", f"expected Queued now that webhook configured, got {d['status']}"
        assert d["leadsCount"] == expected, f"leadsCount {d['leadsCount']} != real lead count {expected}"
        assert d["sentDate"], "sentDate should be set when webhook configured"
        assert d["requestId"].startswith("#")
        rows = client.get(f"{API}/outreach/campaigns").json()
        assert [c for c in rows if c["id"] == d["id"]], "campaign not persisted"

    def test_stats_shape(self, client):
        r = client.get(f"{API}/outreach/stats")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        for k in ["emailsSent", "openRate", "replyRate", "bounceRate", "weeklyEmailsSent"]:
            assert k in d
        assert isinstance(d["weeklyEmailsSent"], list)


# ---------------- Meetings (new payload shape, GET book-slot webhook) ----------------
class TestMeetings:
    @pytest.fixture(scope="class")
    def client(self):
        s = new_client()
        login(s)
        return s

    def test_schedule_new_shape_returns_pending(self, client):
        r = client.post(f"{API}/meetings/schedule", json={
            "client_name": "TEST Lead A", "client_email": "a@test.com",
            "meeting_date": future_date(3), "meeting_time": "14:30",
            "duration_minutes": 30, "meeting_title": "TEST Discovery Call",
            "notes": "TEST notes"}, timeout=60)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert d["status"] == "pending", d
        assert isinstance(d["request_id"], str) and len(d["request_id"]) > 10
        TestMeetings.request_id = d["request_id"]
        TestMeetings.date = future_date(3)

    def test_meeting_appears_pending_reply_with_ist_time(self, client):
        rid = getattr(TestMeetings, "request_id", None)
        assert rid
        st = client.get(f"{API}/meetings/status/{rid}")
        assert st.status_code == 200, st.text[:300]
        assert st.json()["status"] == "pending"
        rows = client.get(f"{API}/meetings").json()
        m = [x for x in rows if x["leadName"] == "TEST Lead A"]
        assert m, "scheduled meeting not returned by GET /api/meetings"
        m = m[0]
        assert m["status"] == "Pending Reply"
        assert m["date"] == TestMeetings.date, f"date drifted: {m['date']} vs {TestMeetings.date}"
        assert m["time"] == "02:30 PM", f"IST time round-trip wrong: {m['time']}"

    def test_schedule_with_lead_id_fills_company(self, client):
        leads = client.get(f"{API}/leads").json()
        if not leads:
            pytest.skip("no leads available for lead_id linkage test")
        lead = leads[0]
        r = client.post(f"{API}/meetings/schedule", json={
            "lead_id": lead["id"], "client_name": "TEST Lead Linked",
            "client_email": lead["email"] or "x@test.com", "meeting_date": future_date(4),
            "meeting_time": "09:00", "duration_minutes": 45, "meeting_title": "TEST Linked"})
        assert r.status_code == 200, r.text[:400]
        rows = client.get(f"{API}/meetings").json()
        m = [x for x in rows if x["leadName"] == "TEST Lead Linked"][0]
        assert m["company"] == (lead["company"] or ""), f"company not derived from lead: {m['company']}"

    def test_invalid_date_400(self, client):
        r = client.post(f"{API}/meetings/schedule", json={
            "client_name": "TEST", "client_email": "a@b.com", "meeting_date": "not-a-date",
            "meeting_time": "14:30", "meeting_title": "T"})
        assert r.status_code == 400, f"{r.status_code} {r.text[:200]}"

    def test_invalid_time_400(self, client):
        r = client.post(f"{API}/meetings/schedule", json={
            "client_name": "TEST", "client_email": "a@b.com", "meeting_date": future_date(2),
            "meeting_time": "2:30 PM", "meeting_title": "T"})
        assert r.status_code == 400, f"{r.status_code} {r.text[:200]}"

    def test_missing_required_fields_422(self, client):
        r = client.post(f"{API}/meetings/schedule", json={"client_name": "TEST"})
        assert r.status_code == 422, r.status_code

    def test_callback_confirms_meeting(self, client):
        rid = client.post(f"{API}/meetings/schedule", json={
            "client_name": "TEST Lead C", "client_email": "c@test.com",
            "meeting_date": future_date(6), "meeting_time": "11:00",
            "meeting_title": "TEST C"}).json()["request_id"]
        link = f"https://meet.google.com/test-{uuid.uuid4().hex[:8]}"
        new_start = (datetime.utcnow() + timedelta(days=7)).replace(microsecond=0).isoformat()
        r = cb("/meetings/callback", {
            "request_id": rid, "outcome": "Confirmed", "meet_link": link,
            "start_time": new_start, "lead_email": "c@test.com", "event_id": "evt-1",
            "fireflies_meeting_id": "ff-1", "proposal_status": "Pending"})
        assert r.status_code == 200, r.text[:400]
        st = client.get(f"{API}/meetings/status/{rid}").json()
        assert st["status"] == "Confirmed"
        assert st["meeting"]["link"] == link

    def test_callback_missing_identifiers_400(self):
        r = cb("/meetings/callback", {"outcome": "Confirmed"})
        assert r.status_code == 400, r.status_code

    def test_auto_booked_creates_row_for_customer(self):
        s = new_client()
        me = signup(s, "autobook")
        link = f"https://meet.google.com/auto-{uuid.uuid4().hex[:8]}"
        start = (datetime.utcnow() + timedelta(days=2)).replace(microsecond=0).isoformat()
        r = cb("/meetings/callback", {
            "meet_link": link, "customer_id": me["id"], "outcome": "Auto-Booked",
            "lead_name": "TEST AutoLead", "company": "TEST AutoCo", "start_time": start})
        assert r.status_code == 200, r.text[:400]
        rows = s.get(f"{API}/meetings").json()
        assert len(rows) == 1, rows
        assert rows[0]["status"] == "Auto-Booked"
        assert rows[0]["link"] == link

    def test_requires_auth(self):
        assert requests.get(f"{API}/meetings").status_code == 401


# ---------------- Proposals ----------------
class TestProposals:
    @pytest.fixture(scope="class")
    def client(self):
        s = new_client()
        login(s)
        return s

    def test_generate_returns_pending(self, client):
        r = client.post(f"{API}/proposals/generate", json={
            "leadName": "TEST Prop A", "company": "TEST PCorp A", "notes": "TEST notes"}, timeout=60)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert d["status"] == "pending", d
        st = client.get(f"{API}/proposals/status/{d['request_id']}")
        assert st.status_code == 200
        assert st.json()["status"] == "pending"

    def test_generate_with_real_lead_id(self, client):
        leads = client.get(f"{API}/leads").json()
        if not leads:
            pytest.skip("no leads for lead_id proposal test")
        r = client.post(f"{API}/proposals/generate", json={
            "lead_id": leads[0]["id"], "leadName": leads[0]["name"],
            "company": leads[0]["company"], "notes": "TEST from real lead"})
        assert r.status_code == 200, r.text[:400]

    def test_callback_needs_review_then_approve(self, client):
        rid = client.post(f"{API}/proposals/generate", json={
            "leadName": "TEST Prop NR", "company": "TEST PCorp NR", "notes": "n"}).json()["request_id"]
        content = "TEST proposal content for needs review"
        r = cb("/proposals/callback", {
            "request_id": rid, "content": content, "lead_name": "TEST Prop NR",
            "company": "TEST PCorp NR", "reviewer_approved": False,
            "reviewer_issues": ["price too low"], "guardrail_errors": []})
        assert r.status_code == 200, r.text[:400]
        rows = client.get(f"{API}/proposals/pending").json()
        m = [x for x in rows if x["leadName"] == "TEST Prop NR"]
        assert m, "needs-review proposal missing from /pending"
        assert m[0]["status"] == "Needs Review"
        assert m[0]["content"] == content
        pid = m[0]["id"]
        assert client.post(f"{API}/proposals/{pid}/approve").status_code == 200
        after = [x for x in client.get(f"{API}/proposals/pending").json() if x["id"] == pid]
        assert after and after[0]["status"] == "Approved"

    def test_callback_auto_approved_shows_sent(self, client):
        rid = client.post(f"{API}/proposals/generate", json={
            "leadName": "TEST Prop SENT", "company": "TEST PCorp S", "notes": "n"}).json()["request_id"]
        r = cb("/proposals/callback", {
            "request_id": rid, "content": "TEST auto approved content",
            "lead_name": "TEST Prop SENT", "company": "TEST PCorp S", "reviewer_approved": True})
        assert r.status_code == 200, r.text[:400]
        rows = client.get(f"{API}/proposals/pending").json()
        m = [x for x in rows if x["leadName"] == "TEST Prop SENT"]
        assert m and m[0]["status"] == "Sent"

    def test_reject_sets_rejected_status(self, client):
        rid = client.post(f"{API}/proposals/generate", json={
            "leadName": "TEST Prop REJ", "company": "TEST PCorp R", "notes": "n"}).json()["request_id"]
        cb("/proposals/callback", {"request_id": rid, "content": "c", "reviewer_approved": False,
                                   "lead_name": "TEST Prop REJ", "company": "TEST PCorp R"})
        pid = [x for x in client.get(f"{API}/proposals/pending").json()
               if x["leadName"] == "TEST Prop REJ"][0]["id"]
        assert client.post(f"{API}/proposals/{pid}/reject").status_code == 200
        rows = [x for x in client.get(f"{API}/proposals/pending").json() if x["id"] == pid]
        assert rows and rows[0]["status"] == "Rejected", rows

    def test_callback_unknown_request_404(self, client):
        r = cb("/proposals/callback", {"request_id": str(uuid.uuid4())})
        assert r.status_code == 404, r.status_code

    def test_approve_other_user_proposal_404(self, client):
        rid = client.post(f"{API}/proposals/generate", json={
            "leadName": "TEST Prop OWN", "company": "TEST PCorp O", "notes": "n"}).json()["request_id"]
        cb("/proposals/callback", {"request_id": rid, "content": "c", "reviewer_approved": False,
                                   "lead_name": "TEST Prop OWN", "company": "TEST PCorp O"})
        pid = [x for x in client.get(f"{API}/proposals/pending").json()
               if x["leadName"] == "TEST Prop OWN"][0]["id"]
        other = new_client()
        signup(other, "propown")
        assert other.post(f"{API}/proposals/{pid}/approve").status_code == 404
        assert other.post(f"{API}/proposals/{pid}/reject").status_code == 404

    def test_requires_auth(self):
        assert requests.get(f"{API}/proposals/pending").status_code == 401


# ---------------- History / Reports ----------------
class TestHistory:
    @pytest.fixture(scope="class")
    def client(self):
        s = new_client()
        login(s)
        return s

    def test_history_requires_auth(self):
        assert requests.get(f"{API}/history").status_code == 401

    def test_history_contains_all_types_sorted(self, client):
        r = client.get(f"{API}/history")
        assert r.status_code == 200, r.text[:400]
        items = r.json()
        assert isinstance(items, list) and items
        types = {i["type"] for i in items}
        for t in ["icp", "leads", "outreach", "meeting", "proposal"]:
            assert t in types, f"missing history type {t}; got {sorted(types)}"
        for i in items:
            assert i["request_id"] and i["type"] and i["title"] and i["created_at"]
            assert "_id" not in i
        ts = [i["created_at"] for i in items]
        assert ts == sorted(ts, reverse=True), "history not sorted desc"

    def test_history_view_targets_resolvable(self, client):
        items = client.get(f"{API}/history").json()
        icp = next(i for i in items if i["type"] == "icp")
        r = client.get(f"{API}/icp/status/{icp['request_id']}")
        assert r.status_code == 200, f"icp row not resolvable: {r.status_code}"
        leads = next(i for i in items if i["type"] == "leads")
        r = client.get(f"{API}/leads?request_id={leads['request_id']}")
        assert r.status_code == 200, r.text[:300]
        outreach = next(i for i in items if i["type"] == "outreach")
        r = client.get(f"{API}/outreach/campaigns?request_id={outreach['request_id']}")
        assert r.status_code == 200 and len(r.json()) == 1, r.text[:300]


# ---------------- Dashboard real aggregation ----------------
class TestDashboard:
    @pytest.fixture(scope="class")
    def client(self):
        s = new_client()
        login(s)
        return s

    def test_stats_reflect_real_counts(self, client):
        leads = client.get(f"{API}/leads").json()
        meets = client.get(f"{API}/meetings").json()
        r = client.get(f"{API}/dashboard/stats")
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert d["totalLeads"]["value"] == len(leads), f"{d['totalLeads']['value']} vs {len(leads)}"
        expected_booked = len([m for m in meets if m["status"] in ("Confirmed", "Auto-Booked")])
        assert d["meetingsBooked"]["value"] == expected_booked
        assert isinstance(d["activityFeed"], list)
        assert len(d["leadsGrowth"]) == 12
        assert len(d["pipelineFunnel"]) == 4

    def test_stats_update_after_creating_campaign(self, client):
        before = client.get(f"{API}/dashboard/stats").json()
        client.post(f"{API}/outreach/campaigns", json={
            "name": "TEST Dash Camp", "subject": "s", "body": "b"})
        after = client.get(f"{API}/dashboard/stats").json()
        titles = [a["title"] for a in after["activityFeed"]]
        assert any("TEST Dash Camp" in t for t in titles), f"activity feed not updated: {titles}"
        assert before is not None

    def test_fresh_user_stats_all_zero(self):
        s = new_client()
        signup(s, "dashzero")
        d = s.get(f"{API}/dashboard/stats").json()
        assert d["totalLeads"]["value"] == 0
        assert d["leadsToday"]["value"] == 0
        assert d["emailsSent"]["value"] == 0
        assert d["meetingsBooked"]["value"] == 0
        assert d["activityFeed"] == []

    def test_requires_auth(self):
        assert requests.get(f"{API}/dashboard/stats").status_code == 401


# ---------------- Tenant isolation ----------------
class TestTenantIsolation:
    def test_fresh_user_sees_zero_of_everything(self):
        owner = new_client()
        login(owner)
        assert owner.get(f"{API}/history").json(), "owner should have history to make this test meaningful"
        s = new_client()
        signup(s, "iso56")
        assert s.get(f"{API}/meetings").json() == []
        assert s.get(f"{API}/proposals/pending").json() == []
        assert s.get(f"{API}/leads").json() == []
        assert s.get(f"{API}/outreach/campaigns").json() == []
        assert s.get(f"{API}/history").json() == []
        assert s.get(f"{API}/icp/latest").json() is None

    def test_customer_id_not_accepted_from_client(self):
        owner = new_client()
        owner_me = login(owner)
        s = new_client()
        signup(s, "spoof")
        s.post(f"{API}/meetings/schedule", json={
            "client_name": "TEST Spoof", "client_email": "s@t.com", "meeting_date": future_date(1),
            "meeting_time": "10:00", "meeting_title": "T",
            "customer_id": owner_me["id"], "user_id": owner_me["id"]})
        owner_rows = owner.get(f"{API}/meetings").json()
        assert not [m for m in owner_rows if m["leadName"] == "TEST Spoof"], "customer_id spoofed via body"

    def test_other_user_cannot_read_meeting_status(self):
        owner = new_client()
        login(owner)
        rid = owner.post(f"{API}/meetings/schedule", json={
            "client_name": "TEST Priv", "client_email": "p@t.com", "meeting_date": future_date(1),
            "meeting_time": "10:00", "meeting_title": "T"}).json()["request_id"]
        other = new_client()
        signup(other, "privm")
        assert other.get(f"{API}/meetings/status/{rid}").status_code == 404

    def test_other_user_cannot_read_icp_status(self):
        owner = new_client()
        login(owner)
        items = owner.get(f"{API}/history").json()
        icp = next((i for i in items if i["type"] == "icp"), None)
        if not icp:
            pytest.skip("no icp history")
        other = new_client()
        signup(other, "privicp")
        assert other.get(f"{API}/icp/status/{icp['request_id']}").status_code == 404

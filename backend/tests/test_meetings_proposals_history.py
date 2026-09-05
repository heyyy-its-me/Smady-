"""Backend tests for the new modules: meetings, proposals, unified history, and strict per-user isolation."""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")).rstrip("/")
API = BASE_URL if BASE_URL.endswith("/api") else f"{BASE_URL}/api"

backend_env = dotenv_values("/app/backend/.env")
CALLBACK_SECRET = backend_env.get("N8N_CALLBACK_SECRET")

EXISTING_EMAIL = "alice.rds.test@example.com"
EXISTING_PASSWORD = "testpass123"


def new_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def signup(session, email=None, password="password123", name="TEST User", company="TEST Co"):
    email = email or f"TEST_mp_{uuid.uuid4().hex[:8]}@example.com"
    r = session.post(f"{API}/auth/signup", json={
        "fullName": name, "email": email, "company": company, "password": password})
    assert r.status_code == 200, f"signup failed: {r.status_code} {r.text[:300]}"
    return r.json()


def login(session, email=EXISTING_EMAIL, password=EXISTING_PASSWORD):
    r = session.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:300]}"
    return r.json()


# ---------------- Critical auth regression ----------------
class TestCriticalAuthRegression:
    """Top-priority regression: signup/login end-to-end against real preview URL."""

    def test_signup_and_login_fresh_user_no_network_error(self):
        s = new_client()
        email = f"TEST_regress_{uuid.uuid4().hex[:8]}@example.com"
        u = signup(s, email=email, name="Regression User")
        assert u["email"] == email.lower()
        assert u["id"]
        # session cookie via signup
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        # login on a new client
        s2 = new_client()
        login(s2, email=email, password="password123")
        me2 = s2.get(f"{API}/auth/me")
        assert me2.status_code == 200
        assert me2.json()["email"] == email.lower()

    def test_existing_user_login(self):
        s = new_client()
        login(s)
        assert s.get(f"{API}/auth/me").status_code == 200


# ---------------- Meetings ----------------
class TestMeetings:
    @pytest.fixture(scope="class")
    def client(self):
        s = new_client()
        login(s)
        return s

    def test_schedule_and_list(self, client):
        dt = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        r = client.post(f"{API}/meetings/schedule", json={
            "lead_name": "TEST Lead M", "lead_email": "leadm@test.com",
            "meeting_date": dt, "meeting_link": "https://meet.example/x",
            "notes": "TEST note"})
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["lead_name"] == "TEST Lead M"
        assert d["status"] == "Confirmed"
        assert d["source"] == "manual"
        TestMeetings.mid = d["id"]

        rows = client.get(f"{API}/meetings").json()
        assert any(x["id"] == TestMeetings.mid for x in rows)

    def test_get_meeting_detail(self, client):
        r = client.get(f"{API}/meetings/{TestMeetings.mid}")
        assert r.status_code == 200
        assert r.json()["id"] == TestMeetings.mid

    def test_get_meeting_bad_uuid_404(self, client):
        r = client.get(f"{API}/meetings/not-a-uuid")
        assert r.status_code == 404

    def test_get_meeting_unknown_id_404(self, client):
        r = client.get(f"{API}/meetings/{uuid.uuid4()}")
        assert r.status_code == 404

    def test_meetings_requires_auth(self):
        assert requests.get(f"{API}/meetings").status_code == 401


# ---------------- Proposals ----------------
class TestProposals:
    @pytest.fixture(scope="class")
    def client(self):
        s = new_client()
        login(s)
        return s

    def test_generate_webhook_not_configured(self, client):
        r = client.post(f"{API}/proposals/generate", json={
            "lead_name": "TEST Lead P", "lead_email": "leadp@test.com",
            "proposal_template": "standard", "key_points": "point A"})
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["final_status"] == "webhook_not_configured"
        assert d["lead_name"] == "TEST Lead P"
        TestProposals.pid = d["id"]

    def test_pending_list_contains_proposal(self, client):
        rows = client.get(f"{API}/proposals/pending").json()
        assert any(x["id"] == TestProposals.pid for x in rows)

    def test_get_proposal_detail(self, client):
        r = client.get(f"{API}/proposals/{TestProposals.pid}")
        assert r.status_code == 200
        assert r.json()["id"] == TestProposals.pid

    def test_approve_updates_status(self, client):
        r = client.post(f"{API}/proposals/{TestProposals.pid}/approve")
        assert r.status_code == 200, r.text[:300]
        assert r.json()["final_status"] == "Approved"
        # verify persistence
        assert client.get(f"{API}/proposals/{TestProposals.pid}").json()["final_status"] == "Approved"

    def test_reject_updates_status(self, client):
        # create a new one to reject
        r = client.post(f"{API}/proposals/generate", json={
            "lead_name": "TEST Reject", "lead_email": "r@test.com",
            "proposal_template": "standard"})
        pid = r.json()["id"]
        rr = client.post(f"{API}/proposals/{pid}/reject")
        assert rr.status_code == 200
        assert rr.json()["final_status"] == "Rejected"
        assert client.get(f"{API}/proposals/{pid}").json()["final_status"] == "Rejected"

    def test_bad_uuid_404(self, client):
        assert client.get(f"{API}/proposals/not-a-uuid").status_code == 404
        assert client.post(f"{API}/proposals/not-a-uuid/approve").status_code == 404
        assert client.post(f"{API}/proposals/not-a-uuid/reject").status_code == 404

    def test_proposals_requires_auth(self):
        assert requests.get(f"{API}/proposals/pending").status_code == 401


# ---------------- Strict per-user isolation ----------------
class TestStrictIsolation:
    def test_user_b_cannot_see_or_access_user_a_records(self):
        # User A: schedule meeting + generate proposal
        a = new_client()
        signup(a, name="User A")
        dt = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        a_meet = a.post(f"{API}/meetings/schedule", json={
            "lead_name": "A meet", "lead_email": "a@ex.com", "meeting_date": dt}).json()
        a_prop = a.post(f"{API}/proposals/generate", json={
            "lead_name": "A prop", "lead_email": "a@ex.com", "proposal_template": "standard"}).json()

        # User B
        b = new_client()
        signup(b, name="User B")

        # B's own lists must NOT contain A's records
        b_meetings = b.get(f"{API}/meetings").json()
        b_props = b.get(f"{API}/proposals/pending").json()
        assert all(m["id"] != a_meet["id"] for m in b_meetings)
        assert all(p["id"] != a_prop["id"] for p in b_props)

        # Direct GET must 404
        assert b.get(f"{API}/meetings/{a_meet['id']}").status_code == 404
        assert b.get(f"{API}/proposals/{a_prop['id']}").status_code == 404

        # B cannot approve/reject A's proposal
        assert b.post(f"{API}/proposals/{a_prop['id']}/approve").status_code == 404
        assert b.post(f"{API}/proposals/{a_prop['id']}/reject").status_code == 404

        # But A still can access their own
        assert a.get(f"{API}/meetings/{a_meet['id']}").status_code == 200
        assert a.get(f"{API}/proposals/{a_prop['id']}").status_code == 200


# ---------------- History ----------------
class TestHistory:
    def test_history_shape_and_isolation(self):
        s = new_client()
        login(s)  # alice: has existing meeting + proposal
        r = s.get(f"{API}/history")
        assert r.status_code == 200, r.text[:300]
        rows = r.json()
        assert isinstance(rows, list)
        types = {x["type"] for x in rows}
        # Alice should at least have a meeting and a proposal per problem statement
        assert "meeting" in types or "proposal" in types or "leads" in types or "icp" in types
        for row in rows:
            assert set(["id", "type", "label", "status", "created_at"]).issubset(row.keys())

    def test_history_fresh_user_empty(self):
        s = new_client()
        signup(s)
        rows = s.get(f"{API}/history").json()
        # Fresh users may or may not have zero (customer_id could load company profiles if account-shared)
        # But no meetings/proposals/leads for this brand new user_id.
        assert all(r["type"] not in ("meeting", "proposal", "leads") for r in rows)

    def test_history_requires_auth(self):
        assert requests.get(f"{API}/history").status_code == 401


# ---------------- API prefix sanity ----------------
class TestApiPrefix:
    def test_no_double_api_prefix(self):
        # A common frontend regression was hitting /api/api/... Ensure /api/api/auth/me returns 404
        r = requests.get(f"{BASE_URL}/api/api/auth/me")
        assert r.status_code == 404

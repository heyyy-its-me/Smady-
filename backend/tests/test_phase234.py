"""Phase 2 polish + Phase 3 read-only + Phase 4 meetings backend tests."""
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")).rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "phase1_test_1788798832@example.com"
PASSWORD = "TestPass123!"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:300]}"
    return s


# ---------------- Auth regression ----------------
class TestAuthRegression:
    def test_login_ok(self, client):
        r = client.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["email"].lower() == EMAIL.lower()

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401


# ---------------- Leads: list with pagination + runs history ----------------
class TestLeadsListing:
    def test_list_leads_default_shape(self, client):
        r = client.get(f"{API}/leads", timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        # New shape: dict with leads/total/run_id/status
        assert isinstance(d, dict), f"expected dict, got {type(d)}"
        assert "leads" in d and "total" in d and "run_id" in d
        assert isinstance(d["leads"], list)
        assert isinstance(d["total"], int)

    def test_list_leads_pagination_bounds(self, client):
        r = client.get(f"{API}/leads?limit=1&offset=0", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert len(d["leads"]) <= 1

    def test_list_leads_bad_limit(self, client):
        r = client.get(f"{API}/leads?limit=0", timeout=15)
        assert r.status_code == 422

    def test_runs_endpoint(self, client):
        r = client.get(f"{API}/leads/runs", timeout=30)
        assert r.status_code == 200, r.text[:300]
        runs = r.json()
        assert isinstance(runs, list)
        if runs:
            row = runs[0]
            for key in ["request_id", "status", "total_count", "filters", "created_at"]:
                assert key in row, f"missing {key} in runs row"

    def test_runs_requires_auth(self):
        r = requests.get(f"{API}/leads/runs", timeout=15)
        assert r.status_code == 401

    def test_list_leads_scoped_by_run_id(self, client):
        runs = client.get(f"{API}/leads/runs", timeout=30).json()
        if not runs:
            pytest.skip("no runs yet")
        rid = runs[0]["request_id"]
        r = client.get(f"{API}/leads?run_id={rid}", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["run_id"] == rid


# ---------------- Outreach: read-only ----------------
class TestOutreachReadOnly:
    def test_stats(self, client):
        r = client.get(f"{API}/outreach/stats", timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        for k in ["emailsSent", "openRate", "replyRate", "bounceRate"]:
            assert k in d, f"missing {k}"
            assert "value" in d[k]

    def test_campaigns_list(self, client):
        r = client.get(f"{API}/outreach/campaigns", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------------- Meetings: full CRUD path ----------------
class TestMeetings:
    def test_list_meetings(self, client):
        r = client.get(f"{API}/meetings", timeout=30)
        assert r.status_code == 200, r.text[:300]
        rows = r.json()
        assert isinstance(rows, list)
        # user is expected to have at least 1 seeded meeting for "Sean Clark"
        names = [x["lead_name"] for x in rows]
        assert any("Sean" in (n or "") for n in names), f"expected Sean Clark meeting in {names}"

    def test_schedule_and_list(self, client):
        unique = uuid.uuid4().hex[:6]
        dt = (datetime.now(timezone.utc) + timedelta(days=7)).replace(microsecond=0).isoformat()
        body = {
            "lead_name": f"TEST Lead {unique}",
            "lead_email": f"test_{unique}@example.com",
            "meeting_date": dt,
            "meeting_link": "https://meet.example.com/x",
            "notes": "created by backend test",
        }
        r = client.post(f"{API}/meetings/schedule", json=body, timeout=30)
        assert r.status_code == 200, r.text[:300]
        created = r.json()
        assert created["lead_name"] == body["lead_name"]
        assert created["status"] == "Confirmed"
        mid = created["id"]

        # Verify persistence
        get_r = client.get(f"{API}/meetings/{mid}", timeout=30)
        assert get_r.status_code == 200
        assert get_r.json()["lead_email"] == body["lead_email"]

        rows = client.get(f"{API}/meetings", timeout=30).json()
        assert any(x["id"] == mid for x in rows)

    def test_meetings_requires_auth(self):
        r = requests.get(f"{API}/meetings", timeout=15)
        assert r.status_code == 401

    def test_meeting_not_found(self, client):
        r = client.get(f"{API}/meetings/{uuid.uuid4()}", timeout=30)
        assert r.status_code == 404


# ---------------- ICP latest (used by Leads pre-fill) ----------------
class TestICPLatest:
    def test_latest(self, client):
        r = client.get(f"{API}/icp/latest", timeout=30)
        assert r.status_code == 200
        # user has 1 ICP already; should not be None
        assert r.json() is not None

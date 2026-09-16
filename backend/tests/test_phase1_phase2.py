"""Focused tests for Phase 1 (auth pbkdf2) + Phase 2 (ICP engine w/ business_stage & priority)."""
import os
import time
import uuid
import psycopg2
import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
backend_env = dotenv_values("/app/backend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env["REACT_APP_BACKEND_URL"]).rstrip("/")
API = f"{BASE_URL}/api"

EXISTING_EMAIL = "phase1_test_1788798832@example.com"
EXISTING_PASSWORD = "TestPass123!"


def _pg():
    return psycopg2.connect(
        host=backend_env["DB_HOST"], port=int(backend_env["DB_PORT"]),
        user=backend_env["DB_USER"], password=backend_env["DB_PASSWORD"],
        dbname=backend_env["PG_DATABASE"], sslmode=backend_env.get("DB_SSLMODE", "prefer"),
    )


# ---------------- Auth (pbkdf2) ----------------
class TestAuthPbkdf2:
    def test_health(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200

    def test_existing_login_works(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": EXISTING_EMAIL, "password": EXISTING_PASSWORD})
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["email"] == EXISTING_EMAIL
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200

    def test_signup_creates_pbkdf2_hash_and_login(self):
        s = requests.Session()
        email = f"test_pbkdf2_{uuid.uuid4().hex[:8]}@example.com"
        pwd = "TestPass123!"
        r = s.post(f"{API}/auth/signup", json={
            "fullName": "PBKDF2 Test", "email": email, "company": "Co", "password": pwd})
        assert r.status_code == 200, r.text[:300]

        # verify pbkdf2 hash in DB
        schema = backend_env.get("DB_SCHEMA", "public")
        conn = _pg()
        try:
            cur = conn.cursor()
            # try configured schema then public
            found = None
            for sch in [schema, "public"]:
                try:
                    cur.execute(f"SELECT password_hash FROM {sch}.users WHERE email=%s", (email.lower(),))
                    row = cur.fetchone()
                    if row:
                        found = (sch, row[0])
                        break
                except Exception:
                    conn.rollback()
            assert found is not None, "user not found in DB"
            sch, h = found
            print(f"hash found in schema {sch}: {h[:25]}")
            assert h.startswith("pbkdf2$210000$"), f"expected pbkdf2$210000$ prefix, got {h[:25]}"
        finally:
            conn.close()

        # logout then log back in with same password
        s.post(f"{API}/auth/logout")
        s2 = requests.Session()
        r2 = s2.post(f"{API}/auth/login", json={"email": email, "password": pwd})
        assert r2.status_code == 200, r2.text[:300]
        assert s2.get(f"{API}/auth/me").status_code == 200

    def test_wrong_password_401(self):
        r = requests.post(f"{API}/auth/login", json={"email": EXISTING_EMAIL, "password": "wrong_wrong_wrong"})
        assert r.status_code == 401
        assert "invalid" in r.json()["detail"].lower()

    def test_five_failed_attempts_lockout(self):
        # use a fresh signed-up user to not lock existing test account
        s = requests.Session()
        email = f"test_lock_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/signup", json={
            "fullName": "Lock", "email": email, "company": "c", "password": "TestPass123!"})
        assert r.status_code == 200
        codes = []
        for _ in range(6):
            rr = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrong"})
            codes.append(rr.status_code)
        print("attempt codes:", codes)
        assert 429 in codes, f"expected 429 lockout, got {codes}"
        # cleanup: clear lockout
        try:
            schema = backend_env.get("DB_SCHEMA", "public")
            conn = _pg()
            cur = conn.cursor()
            for sch in [schema, "public"]:
                try:
                    cur.execute(f"UPDATE {sch}.login_attempts SET attempts=0, locked_until=NULL WHERE identifier=%s", (email,))
                    conn.commit()
                except Exception:
                    conn.rollback()
            conn.close()
        except Exception:
            pass


# ---------------- ICP (real external API) ----------------
class TestICPEngine:
    @pytest.fixture(scope="class")
    def client(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": EXISTING_EMAIL, "password": EXISTING_PASSWORD})
        assert r.status_code == 200
        return s

    def test_generate_missing_new_fields_422(self, client):
        r = client.post(f"{API}/icp/generate", json={
            "productName": "P", "productDescription": "d", "companyName": "C", "companyDetails": "cd",
            "countries": ["USA"], "industries": ["SaaS"]})
        # businessStage and priority are required now
        assert r.status_code == 422, r.status_code

    def test_generate_real_api(self, client):
        body = {
            "productName": "AutoTest AI",
            "productDescription": "AI platform that automates B2B sales outreach and lead qualification.",
            "companyName": "AutoTest Inc",
            "companyDetails": "Series A B2B SaaS startup based in San Francisco, 25 employees.",
            "countries": ["United States", "Canada"],
            "industries": ["SaaS", "Technology"],
            "businessStage": "Growth",
            "priority": "High",
        }
        r = client.post(f"{API}/icp/generate", json=body)
        assert r.status_code == 200, r.text[:500]
        d = r.json()
        assert "request_id" in d
        assert d["status"] in ("completed", "failed"), d
        if d["status"] == "failed":
            pytest.fail(f"ICP external API call failed: {d}")
        # fetch status/latest
        rid = d["request_id"]
        s = client.get(f"{API}/icp/status/{rid}")
        assert s.status_code == 200
        sd = s.json()
        assert sd["status"] == "completed"
        result = sd["result"]
        assert result is not None
        assert "industry" in result and "targetRoles" in result
        assert "geography" in result and "painPoints" in result
        assert "companySize" in result and result["companySize"] == []  # empty by design
        # at least one of the chip groups should have entries
        assert any(len(result[k]) > 0 for k in ("industry", "targetRoles", "geography", "painPoints")), result
        print("ICP result:", {k: len(result[k]) for k in result})

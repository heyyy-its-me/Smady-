import asyncio
import os
import sys
from http.cookies import SimpleCookie
from types import SimpleNamespace
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pytest
import jwt
from cryptography.fernet import Fernet
from fastapi import HTTPException
from starlette.responses import Response

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
TEST_SECRET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
for key, value in {
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_USER": "test",
    "DB_PASSWORD": "test",
    "PG_DATABASE": "test",
    "DB_SCHEMA": "smady",
    "JWT_SECRET": TEST_SECRET,
    "N8N_CALLBACK_SECRET": TEST_SECRET[::-1],
}.items():
    os.environ.setdefault(key, value)

from routers import google_router, meetings_router, outreach_router  # noqa: E402


class NoQueryDatabase:
    def __init__(self):
        self.queries = 0

    async def execute(self, *_args, **_kwargs):
        self.queries += 1
        raise AssertionError("database must not be queried before callback-secret validation")


class FakeMeetingDatabase:
    def __init__(self, row):
        self.row = row
        self.statement = None
        self.commits = 0

    async def execute(self, statement, *_args, **_kwargs):
        self.statement = statement
        return type("Result", (), {"first": lambda _self: self.row})()

    async def commit(self):
        self.commits += 1


def test_google_oauth_state_is_signed_and_bound_to_cookie_nonce(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", TEST_SECRET)
    state = google_router._encode_state("connect", "browser-nonce", "user-123", "/signup")
    decoded = google_router._decode_state(state, "browser-nonce")
    assert decoded["intent"] == "connect"
    assert decoded["sub"] == "user-123"
    # Return paths are constrained to known local routes, preventing open redirects.
    assert decoded["return_to"] == "/signup"
    with pytest.raises(google_router.OAuthFlowError):
        google_router._decode_state(state, "attacker-nonce")
    with pytest.raises(google_router.OAuthFlowError):
        google_router._decode_state("tampered", "browser-nonce")


def test_google_tokens_are_encrypted_and_require_the_correct_key():
    cipher = Fernet(Fernet.generate_key())
    encrypted = google_router._encrypt_token(cipher, "refresh-secret-value")
    assert encrypted != "refresh-secret-value"
    assert google_router._decrypt_token(cipher, encrypted) == "refresh-secret-value"
    with pytest.raises(HTTPException) as error:
        google_router._decrypt_token(Fernet(Fernet.generate_key()), encrypted)
    assert error.value.status_code == 503


def test_google_start_builds_consent_url_and_httponly_state_cookie(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setenv("GOOGLE_REDIRECT_URI", "https://app.example/api/auth/google/callback")
    monkeypatch.setenv("JWT_SECRET", TEST_SECRET)

    response = asyncio.run(google_router.google_start(intent="login", return_to="/signup", user=None))
    parsed_url = urlparse(response.headers["location"])
    params = parse_qs(parsed_url.query)
    assert parsed_url.netloc == "accounts.google.com"
    assert params["client_id"] == ["test-client-id"]
    assert params["prompt"] == ["select_account"]
    assert params["scope"][0] == google_router.GOOGLE_IDENTITY_SCOPES
    assert "access_type" not in params
    cookie = SimpleCookie()
    cookie.load(response.headers["set-cookie"])
    state_cookie = cookie[google_router.GOOGLE_STATE_COOKIE]
    assert state_cookie["httponly"]
    assert state_cookie["path"] == google_router.GOOGLE_STATE_COOKIE_PATH
    state_payload = google_router._decode_state(params["state"][0], state_cookie.value)
    assert state_payload["return_to"] == "/signup"


def test_google_connect_requests_integration_scopes_after_explicit_login(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setenv("GOOGLE_REDIRECT_URI", "https://app.example/api/auth/google/callback")
    monkeypatch.setenv("GOOGLE_TOKEN_ENCRYPTION_KEY", Fernet.generate_key().decode())
    monkeypatch.setenv("JWT_SECRET", TEST_SECRET)
    response = asyncio.run(google_router.google_start(
        intent="connect", return_to="/profile", user={"id": "user-123"}
    ))
    params = parse_qs(urlparse(response.headers["location"]).query)
    assert "gmail.send" in params["scope"][0]
    assert "calendar.events.owned" in params["scope"][0]
    assert params["access_type"] == ["offline"]
    assert params["prompt"] == ["consent select_account"]


def test_password_mailer_setup_requires_private_secret(monkeypatch):
    monkeypatch.setenv("GOOGLE_MAILER_SETUP_SECRET", TEST_SECRET)
    with pytest.raises(HTTPException) as error:
        asyncio.run(google_router.google_mailer_start("incorrect"))
    assert error.value.status_code == 401


def test_password_mailer_setup_builds_scoped_callback_url(monkeypatch):
    monkeypatch.setenv("GOOGLE_MAILER_CLIENT_ID", "test-mailer-client-id")
    monkeypatch.setenv("GOOGLE_MAILER_CLIENT_SECRET", "test-mailer-client-secret")
    monkeypatch.setenv("GOOGLE_MAILER_REDIRECT_URI", "https://app.example/api/auth/google/mailer/callback")
    monkeypatch.setenv("GOOGLE_MAILER_SETUP_SECRET", TEST_SECRET)
    monkeypatch.setenv("GOOGLE_TOKEN_ENCRYPTION_KEY", Fernet.generate_key().decode())
    monkeypatch.setenv("JWT_SECRET", TEST_SECRET)

    result = asyncio.run(google_router.google_mailer_start(TEST_SECRET))
    params = parse_qs(urlparse(result["authorization_url"]).query)
    assert params["client_id"] == ["test-mailer-client-id"]
    assert params["redirect_uri"] == ["https://app.example/api/auth/google/mailer/callback"]
    assert "gmail.send" in params["scope"][0]
    assert params["access_type"] == ["offline"]
    state = jwt.decode(params["state"][0], TEST_SECRET, algorithms=["HS256"])
    assert state["type"] == "google_mailer_setup"
    assert state["exp"]


def test_campaign_api_rejects_without_recipient_opt_in_attestation(monkeypatch):
    async def no_rate_limit(*_args, **_kwargs):
        return None

    monkeypatch.setattr(outreach_router, "enforce_rate_limit", no_rate_limit)
    body = outreach_router.CampaignCreateRequest(name="test", body="test message")
    with pytest.raises(HTTPException) as error:
        asyncio.run(outreach_router.create_campaign(
            body,
            user={"id": "user-123", "customer_id": "customer-123"},
            db=NoQueryDatabase(),
        ))
    assert error.value.status_code == 400
    assert "opted in" in error.value.detail


def test_n8n_token_endpoint_rejects_bad_callback_secret_before_database_access(monkeypatch):
    monkeypatch.setenv("N8N_CALLBACK_SECRET", TEST_SECRET[::-1])
    db = NoQueryDatabase()
    with pytest.raises(HTTPException) as error:
        asyncio.run(google_router.n8n_google_token(
            google_router.N8NTokenRequest(user_id="6c2f34d8-e5f4-4c2e-b3e2-c51e537c7831"),
            Response(),
            "wrong-secret",
            db,
        ))
    assert error.value.status_code == 401
    assert db.queries == 0


def test_google_meeting_callback_updates_only_the_matching_user_meeting(monkeypatch):
    monkeypatch.setenv("N8N_CALLBACK_SECRET", TEST_SECRET[::-1])
    meeting_id = "6c2f34d8-e5f4-4c2e-b3e2-c51e537c7831"
    user_id = "0f11edc7-dd88-4c45-9437-c89da84d2774"
    row = SimpleNamespace(
        id=meeting_id,
        user_id=user_id,
        request_id=None,
        lead_name="Test Lead",
        lead_email="lead@example.com",
        meeting_date=None,
        meeting_link="https://meet.google.com/abc-defg-hij",
        status="Confirmed",
        source="manual",
        notes=None,
        created_at=None,
    )
    db = FakeMeetingDatabase(row)
    result = asyncio.run(meetings_router.google_event_callback(
        meetings_router.GoogleMeetingResultRequest(
            meeting_id=meeting_id,
            user_id=user_id,
            meeting_link=row.meeting_link,
        ),
        TEST_SECRET[::-1],
        db,
    ))
    assert result["meeting_link"] == row.meeting_link
    assert result["status"] == "Confirmed"
    query = str(db.statement).lower()
    assert "meetings.id" in query and "meetings.user_id" in query
    assert db.commits == 1

"""Focused regression tests for application security controls."""
import asyncio
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from starlette.requests import Request
from starlette.responses import Response

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
TEST_JWT_SECRET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
TEST_CALLBACK_SECRET = TEST_JWT_SECRET[::-1]
for key, value in {
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_USER": "test",
    "DB_PASSWORD": "test",
    "PG_DATABASE": "test",
    "DB_SCHEMA": "public",
    "JWT_SECRET": TEST_JWT_SECRET,
    "N8N_CALLBACK_SECRET": TEST_CALLBACK_SECRET,
}.items():
    os.environ.setdefault(key, value)

from auth import (  # noqa: E402
    enforce_rate_limit,
    rate_limit_key,
    set_auth_cookies,
    clear_auth_cookies,
    validate_new_password,
)
import auth
from routers import auth_router, meetings_router, outreach_router, proposals_router  # noqa: E402
import server  # noqa: E402


class FakeResult:
    def __init__(self, row=None, rows=None, scalar=None):
        self.row = row
        self.rows = rows or []
        self.scalar = scalar

    def first(self):
        return self.row

    def fetchall(self):
        return self.rows

    def scalar_one(self):
        return self.scalar


class FakeDatabase:
    def __init__(self, results=None):
        self.results = list(results or [])
        self.statements = []
        self.commits = 0
        self.rollbacks = 0

    async def execute(self, statement, *_args, **_kwargs):
        self.statements.append(statement)
        if self.results:
            result = self.results.pop(0)
            return result if isinstance(result, FakeResult) else FakeResult(row=result)
        return FakeResult()

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        self.rollbacks += 1


def make_request(method="POST", headers=(), client=("127.0.0.1", 1234)):
    return Request({
        "type": "http",
        "http_version": "1.1",
        "method": method,
        "scheme": "https",
        "path": "/api/test",
        "raw_path": b"/api/test",
        "query_string": b"",
        "headers": list(headers),
        "client": client,
        "server": ("app.example", 443),
    })


def test_email_log_rejects_missing_and_invalid_callback_secret(monkeypatch):
    monkeypatch.setenv("N8N_CALLBACK_SECRET", TEST_CALLBACK_SECRET)
    body = {"emails": [{"email": "lead@example.test", "status": "sent"}]}

    for secret in (None, "invalid"):
        db = FakeDatabase()
        with pytest.raises(HTTPException) as error:
            asyncio.run(outreach_router.log_emails_sent(body, secret, db))
        assert error.value.status_code == 401
        assert db.statements == []
        assert db.commits == 0


def test_email_log_accepts_valid_callback_secret(monkeypatch):
    secret = TEST_CALLBACK_SECRET
    monkeypatch.setenv("N8N_CALLBACK_SECRET", secret)
    db = FakeDatabase()
    response = asyncio.run(outreach_router.log_emails_sent(
        {"emails": [{"email": "lead@example.test", "status": "sent"}]}, secret, db
    ))
    assert response["logged"] == 1
    assert len(db.statements) == 1
    assert db.commits == 1


def test_password_policy_accepts_long_passphrases_and_rejects_short_or_oversized():
    validate_new_password("a calm and lengthy passphrase")
    for password in ("fourteen-chars", "x" * 129):
        with pytest.raises(HTTPException) as error:
            validate_new_password(password)
        assert error.value.status_code == 400


def test_production_requires_secure_cookies_and_strong_secrets(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "0123456789abcdef" * 4)
    monkeypatch.setenv("N8N_CALLBACK_SECRET", "fedcba9876543210" * 4)
    monkeypatch.setattr(auth, "APP_ENV", "production")
    monkeypatch.setenv("COOKIE_SECURE", "false")
    with pytest.raises(RuntimeError, match="COOKIE_SECURE"):
        auth.validate_security_configuration()
    monkeypatch.setenv("COOKIE_SECURE", "true")
    auth.validate_security_configuration()
    monkeypatch.setenv("JWT_SECRET", TEST_JWT_SECRET)
    with pytest.raises(RuntimeError, match="known development"):
        auth.validate_security_configuration()
    monkeypatch.setenv("JWT_SECRET", "weak")
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        auth.validate_security_configuration()


def test_refresh_cookie_is_limited_and_deleted_at_the_same_path():
    response = Response()
    set_auth_cookies(response, "access-test", "refresh-test")
    cookies = response.headers.getlist("set-cookie")
    refresh_cookie = next(cookie for cookie in cookies if cookie.startswith("refresh_token="))
    assert "Path=/api/auth" in refresh_cookie
    assert "HttpOnly" in refresh_cookie
    clear_response = Response()
    clear_auth_cookies(clear_response)
    cleared = next(cookie for cookie in clear_response.headers.getlist("set-cookie") if cookie.startswith("refresh_token="))
    assert "Path=/api/auth" in cleared
    assert "Max-Age=0" in cleared


def test_password_reset_token_is_not_written_to_logs(monkeypatch, caplog):
    monkeypatch.setenv("JWT_SECRET", TEST_JWT_SECRET)
    rate_limit_calls = []
    reset_emails = []

    async def allow_rate_limited_request(*_args, **_kwargs):
        rate_limit_calls.append((_args[2], _args[3]))
        return None

    async def capture_reset_email(email, token):
        reset_emails.append((email, token))
        return False

    monkeypatch.setattr(auth_router, "enforce_rate_limit", allow_rate_limited_request)
    monkeypatch.setattr(auth_router, "send_password_reset_email", capture_reset_email)
    db = FakeDatabase([FakeResult(row=SimpleNamespace(id="user-a"))])
    request = make_request()
    body = auth_router.ForgotPasswordRequest(email="user@example.com")
    with caplog.at_level("INFO", logger="routers.auth_router"):
        asyncio.run(auth_router.forgot_password(body, request, db))
    issued_token = db.statements[1].compile().params["token"]
    assert issued_token not in caplog.text
    assert "Password reset requested" in caplog.text
    assert rate_limit_calls == [(10, 3600), (3, 86400)]
    assert reset_emails and reset_emails[0][0] == "user@example.com"
    assert reset_emails[0][1] == issued_token


def test_rate_limiter_uses_shared_atomic_database_counter_and_returns_429():
    db = FakeDatabase([FakeResult(scalar=n) for n in (1, 2, 3)])
    key = rate_limit_key("test", "subject@example.test")
    assert "subject@example.test" not in key
    asyncio.run(enforce_rate_limit(db, key, limit=2, window_seconds=60))
    asyncio.run(enforce_rate_limit(db, key, limit=2, window_seconds=60))
    with pytest.raises(HTTPException) as error:
        asyncio.run(enforce_rate_limit(db, key, limit=2, window_seconds=60))
    assert error.value.status_code == 429
    assert error.value.headers["Retry-After"] == "60"
    assert db.commits == 3


def test_proposal_list_for_user_without_leads_never_uses_unowned_row_fallback(monkeypatch):
    async def no_emails(_db, _user_id):
        return set()

    monkeypatch.setattr(proposals_router, "_get_user_lead_emails", no_emails)
    db = FakeDatabase([FakeResult(rows=[]), FakeResult(rows=[])])
    result = asyncio.run(proposals_router.list_proposals(user={"id": "user-a"}, db=db))
    assert result == {"review_queue": [], "app_proposals": []}
    where_sql = str(db.statements[0]).lower()
    assert "user_id" in where_sql and "is null" in where_sql


def test_proposal_detail_is_not_found_for_other_user_review_row(monkeypatch):
    async def no_emails(_db, _user_id):
        return set()

    monkeypatch.setattr(proposals_router, "_get_user_lead_emails", no_emails)
    db = FakeDatabase([FakeResult(rows=[])])
    with pytest.raises(HTTPException) as error:
        asyncio.run(proposals_router.get_proposal("123", user={"id": "user-b"}, db=db))
    assert error.value.status_code == 404
    assert "user_id" in str(db.statements[0]).lower()


def test_meeting_update_requires_secret_for_anonymous_webhook(monkeypatch):
    monkeypatch.setenv("N8N_CALLBACK_SECRET", TEST_CALLBACK_SECRET)
    body = meetings_router.UpdateMeetingStatusRequest(
        lead_email="lead@example.test", meeting_date="2026-10-16", meeting_id="8ed58067-a49c-4abc-a4b5-982aeb21cc4e", status="Scheduled"
    )
    db = FakeDatabase()
    with pytest.raises(HTTPException) as error:
        asyncio.run(meetings_router.update_meeting_status(body, x_callback_secret=None, user=None, db=db))
    assert error.value.status_code == 401
    assert db.statements == []


def test_user_meeting_update_query_is_scoped_to_authenticated_owner():
    body = meetings_router.UpdateMeetingStatusRequest(
        lead_email="lead@example.test", meeting_date="2026-10-16", meeting_id="8ed58067-a49c-4abc-a4b5-982aeb21cc4e", status="Scheduled"
    )
    db = FakeDatabase([FakeResult(rows=[])])
    with pytest.raises(HTTPException) as error:
        asyncio.run(meetings_router.update_meeting_status(body, user={"id": "user-b"}, db=db))
    assert error.value.status_code == 404
    assert "meetings.user_id" in str(db.statements[0]).lower()
    assert db.commits == 0


def test_csrf_guard_rejects_untrusted_origin_and_adds_security_headers(monkeypatch):
    monkeypatch.setattr(server, "TRUSTED_ORIGINS", {"https://app.example"})

    async def ok(_request):
        return Response(status_code=200)

    denied = asyncio.run(server.security_headers_and_csrf(
        make_request(headers=[(b"origin", b"https://attacker.example")]), ok
    ))
    assert denied.status_code == 403
    allowed = asyncio.run(server.security_headers_and_csrf(
        make_request(headers=[(b"origin", b"https://app.example")]), ok
    ))
    assert allowed.status_code == 200
    assert allowed.headers["X-Content-Type-Options"] == "nosniff"
    assert "default-src 'none'" in allowed.headers["Content-Security-Policy"]


def test_cors_rejects_wildcard_configuration(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "*")
    with pytest.raises(RuntimeError):
        server.allowed_origins()

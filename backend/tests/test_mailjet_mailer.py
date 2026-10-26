import asyncio
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

for key, value in {
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_USER": "test",
    "DB_PASSWORD": "test",
    "PG_DATABASE": "test",
    "DB_SCHEMA": "smady",
}.items():
    os.environ.setdefault(key, value)

import mailjet_mailer  # noqa: E402


class FakeMailjetResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {"Messages": [{"Status": "success"}]}

    def json(self):
        return self._payload


class FakeMailjetClient:
    captured = {}
    response = FakeMailjetResponse()

    def __init__(self, *, timeout, auth):
        self.captured["timeout"] = timeout
        self.captured["auth"] = auth

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def post(self, url, *, json):
        self.captured["url"] = url
        self.captured["payload"] = json
        return self.response


def configure_mailjet(monkeypatch):
    monkeypatch.setenv("MAILJET_API_KEY", "test-mailjet-key")
    monkeypatch.setenv("MAILJET_API_SECRET", "test-mailjet-secret")
    monkeypatch.setenv("MAILJET_FROM_EMAIL", "verified@example.com")
    monkeypatch.setenv("MAILJET_FROM_NAME", "Smady Test")
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://app.example")
    FakeMailjetClient.captured = {}
    FakeMailjetClient.response = FakeMailjetResponse()
    monkeypatch.setattr(mailjet_mailer.httpx, "AsyncClient", FakeMailjetClient)


def test_reset_email_uses_mailjet_v31_and_verified_sender(monkeypatch):
    configure_mailjet(monkeypatch)
    sent = asyncio.run(mailjet_mailer.send_password_reset_email(
        "person@example.net", "one-time-token"
    ))

    assert sent is True
    assert FakeMailjetClient.captured["url"] == "https://api.mailjet.com/v3.1/send"
    assert FakeMailjetClient.captured["auth"] == ("test-mailjet-key", "test-mailjet-secret")
    message = FakeMailjetClient.captured["payload"]["Messages"][0]
    assert message["From"] == {"Email": "verified@example.com", "Name": "Smady Test"}
    assert message["To"] == [{"Email": "person@example.net"}]
    assert "one-time-token" in message["TextPart"]
    assert "one-time-token" in message["HTMLPart"]
    assert "HTMLPart" in message and "TextPart" in message


def test_reset_email_fails_closed_when_sender_is_missing(monkeypatch):
    configure_mailjet(monkeypatch)
    monkeypatch.delenv("MAILJET_FROM_EMAIL")

    sent = asyncio.run(mailjet_mailer.send_password_reset_email(
        "person@example.net", "one-time-token"
    ))

    assert sent is False
    assert FakeMailjetClient.captured == {}


def test_reset_email_reports_mailjet_rejection_without_exposing_response(monkeypatch, caplog):
    configure_mailjet(monkeypatch)
    FakeMailjetClient.response = FakeMailjetResponse(
        status_code=200,
        payload={"Messages": [{"Status": "error", "Errors": [{"ErrorMessage": "test provider detail"}]}]},
    )
    with caplog.at_level("WARNING", logger="mailjet_mailer"):
        sent = asyncio.run(mailjet_mailer.send_password_reset_email(
            "private-recipient@example.net", "private-reset-token"
        ))

    assert sent is False
    assert "test provider detail" not in caplog.text
    assert "private-recipient@example.net" not in caplog.text
    assert "private-reset-token" not in caplog.text

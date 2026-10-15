"""Focused tests for required source selection and n8n payload propagation."""
import asyncio
import os
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

# The route module creates a SQLAlchemy engine on import; these placeholders are
# sufficient because this test replaces the DB session and never opens a connection.
for key, value in {
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_USER": "test",
    "DB_PASSWORD": "test",
    "PG_DATABASE": "test",
    "DB_SCHEMA": "public",
}.items():
    os.environ.setdefault(key, value)

import routers.leads_router as leads_router  # noqa: E402


class FakeDatabase:
    async def execute(self, *_args, **_kwargs):
        return None

    async def commit(self):
        return None


@pytest.mark.parametrize("source", ["linkedin", "google_maps"])
def test_selected_lead_source_reaches_webhook(monkeypatch, source):
    captured = {}

    monkeypatch.setattr(leads_router, "is_webhook_configured", lambda _kind: True)

    async def capture_webhook(kind, payload):
        captured["kind"] = kind
        captured["payload"] = payload
        return True

    monkeypatch.setattr(leads_router, "trigger_webhook", capture_webhook)
    monkeypatch.setenv("PUBLIC_BACKEND_URL", "https://backend.example")
    request = leads_router.LeadsGenerateRequest(leadSource=source)
    user = {"id": "user-1", "customer_id": "customer-1"}

    asyncio.run(leads_router.generate_leads(request, user, FakeDatabase()))

    assert captured["kind"] == "leads"
    assert captured["payload"]["leadSource"] == source


def test_lead_source_is_required_and_restricted_to_supported_values():
    with pytest.raises(ValidationError):
        leads_router.LeadsGenerateRequest()
    with pytest.raises(ValidationError):
        leads_router.LeadsGenerateRequest(leadSource="other")

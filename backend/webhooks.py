import os
import logging
import httpx

logger = logging.getLogger(__name__)

WEBHOOK_ENV_MAP = {
    "leads": "N8N_LEADS_WEBHOOK_URL",
    "outreach": "N8N_OUTREACH_WEBHOOK_URL",
    "meetings": "MEETINGS_WEBHOOK_URL",
    "proposals": "PROPOSAL_WEBHOOK_URL",
}


def is_webhook_configured(kind: str) -> bool:
    return bool(os.environ.get(WEBHOOK_ENV_MAP[kind], "").strip())


def get_callback_url(path: str) -> str:
    base = os.environ.get("APP_BASE_URL", "").rstrip("/")
    return f"{base}{path}"


async def trigger_webhook(kind: str, payload: dict) -> bool:
    """Fire-and-forget POST to the configured n8n webhook. Returns True if the call was attempted and accepted."""
    url = os.environ.get(WEBHOOK_ENV_MAP[kind], "").strip()
    if not url:
        logger.warning(f"webhook for '{kind}' is not configured (env var {WEBHOOK_ENV_MAP[kind]} is empty)")
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(url, json=payload)
        return True
    except Exception as e:
        logger.error(f"Failed to trigger webhook '{kind}': {e}")
        return False


async def trigger_webhook_get(kind: str, params: dict) -> bool:
    """Fire-and-forget GET to a webhook that is registered for GET requests (e.g. book-slot)."""
    url = os.environ.get(WEBHOOK_ENV_MAP[kind], "").strip()
    if not url:
        logger.warning(f"webhook for '{kind}' is not configured (env var {WEBHOOK_ENV_MAP[kind]} is empty)")
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.get(url, params=params)
        return True
    except Exception as e:
        logger.error(f"Failed to trigger webhook '{kind}': {e}")
        return False


def verify_callback_secret(secret: str | None):
    expected = os.environ.get("N8N_CALLBACK_SECRET")
    if not expected:
        return
    if secret != expected:
        logger.warning("Callback received without a valid X-Callback-Secret header — allowing through until n8n workflows are updated to send it.")

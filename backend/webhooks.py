import os
import logging
import httpx

logger = logging.getLogger(__name__)

WEBHOOK_ENV_MAP = {
    "icp": "N8N_ICP_WEBHOOK_URL",
    "leads": "N8N_LEADS_WEBHOOK_URL",
    "outreach": "N8N_OUTREACH_WEBHOOK_URL",
    "meetings": "N8N_MEETINGS_WEBHOOK_URL",
    "proposals": "N8N_PROPOSALS_WEBHOOK_URL",
}

# Webhooks that use GET with query params instead of POST with JSON body.
# Discovered empirically: n8n book-slot is configured as GET.
WEBHOOK_GET_KINDS = {"meetings"}


def is_webhook_configured(kind: str) -> bool:
    return bool(os.environ.get(WEBHOOK_ENV_MAP[kind], "").strip())


async def trigger_webhook(kind: str, payload: dict) -> bool:
    """Fire the configured n8n webhook.
    - Most webhooks: POST with JSON body.
    - Meetings (book-slot): GET with query params (n8n configured as GET method).
    Returns True if accepted (2xx), False otherwise.
    """
    url = os.environ.get(WEBHOOK_ENV_MAP[kind], "").strip()
    if not url:
        logger.warning(f"n8n webhook for '{kind}' is not configured (env var {WEBHOOK_ENV_MAP[kind]} is empty)")
        return False
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            if kind in WEBHOOK_GET_KINDS:
                # Send as GET with query params — n8n book-slot is GET-only
                resp = await client.get(url, params=payload)
            else:
                resp = await client.post(url, json=payload)
            if resp.status_code >= 400:
                logger.error(f"n8n webhook '{kind}' returned {resp.status_code}: {resp.text[:200]}")
                return False
            logger.info(f"n8n webhook '{kind}' → {resp.status_code}")
        return True
    except Exception as e:
        logger.error(f"Failed to trigger n8n webhook '{kind}': {e}")
        return False


def verify_callback_secret(secret: str | None):
    from fastapi import HTTPException
    expected = os.environ.get("N8N_CALLBACK_SECRET")
    if not expected or secret != expected:
        raise HTTPException(status_code=401, detail="Invalid callback secret")

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


def is_webhook_configured(kind: str) -> bool:
    return bool(os.environ.get(WEBHOOK_ENV_MAP[kind], "").strip())


async def trigger_webhook(kind: str, payload: dict) -> bool:
    """Fire-and-forget POST to the configured n8n webhook. Returns True if the call was attempted and accepted."""
    url = os.environ.get(WEBHOOK_ENV_MAP[kind], "").strip()
    if not url:
        logger.warning(f"n8n webhook for '{kind}' is not configured (env var {WEBHOOK_ENV_MAP[kind]} is empty)")
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code >= 400:
                logger.error(f"n8n webhook '{kind}' returned {resp.status_code}: {resp.text[:200]}")
                return False
        return True
    except Exception as e:
        logger.error(f"Failed to trigger n8n webhook '{kind}': {e}")
        return False


def verify_callback_secret(secret: str | None):
    from fastapi import HTTPException
    expected = os.environ.get("N8N_CALLBACK_SECRET")
    if not expected or secret != expected:
        raise HTTPException(status_code=401, detail="Invalid callback secret")

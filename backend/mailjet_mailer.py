"""Mailjet v3.1 transactional delivery for password-reset messages."""
import html
import logging
import os
from urllib.parse import urlencode

import httpx

logger = logging.getLogger(__name__)
MAILJET_SEND_URL = "https://api.mailjet.com/v3.1/send"


class MailerNotConfigured(Exception):
    pass


def _settings() -> tuple[str, str, str, str, str]:
    api_key = os.environ.get("MAILJET_API_KEY", "").strip()
    api_secret = os.environ.get("MAILJET_API_SECRET", "").strip()
    from_email = os.environ.get("MAILJET_FROM_EMAIL", "").strip()
    from_name = os.environ.get("MAILJET_FROM_NAME", "Smady").strip() or "Smady"
    frontend_url = os.environ.get("PUBLIC_FRONTEND_URL", "").strip().rstrip("/")
    if not all((api_key, api_secret, from_email, frontend_url)):
        raise MailerNotConfigured("Mailjet reset-email settings are incomplete")
    return api_key, api_secret, from_email, from_name, frontend_url


async def send_password_reset_email(recipient: str, reset_token: str) -> bool:
    """Send a one-time reset link without logging personal data or the token."""
    try:
        api_key, api_secret, from_email, from_name, frontend_url = _settings()
        reset_url = f"{frontend_url}/reset-password?{urlencode({'token': reset_token})}"
        safe_url = html.escape(reset_url, quote=True)
        payload = {
            "Messages": [
                {
                    "From": {"Email": from_email, "Name": from_name},
                    "To": [{"Email": recipient}],
                    "Subject": "Reset your Smady password",
                    "TextPart": (
                        "We received a request to reset your Smady password.\n\n"
                        f"Open this link within 60 minutes to choose a new password:\n{reset_url}\n\n"
                        "If you did not request this, you can ignore this email."
                    ),
                    "HTMLPart": (
                        "<p>We received a request to reset your Smady password.</p>"
                        f'<p><a href="{safe_url}">Choose a new password</a></p>'
                        "<p>This link expires in 60 minutes. If you did not request a reset, ignore this email.</p>"
                    ),
                    "CustomID": "smady-password-reset",
                }
            ]
        }
        async with httpx.AsyncClient(timeout=15, auth=(api_key, api_secret)) as client:
            response = await client.post(MAILJET_SEND_URL, json=payload)
        if response.status_code >= 400:
            logger.warning("Mailjet reset-email delivery failed (HTTP %s)", response.status_code)
            return False
        try:
            messages = response.json().get("Messages", [])
        except (ValueError, AttributeError):
            logger.warning("Mailjet returned an unreadable reset-email response")
            return False
        if not messages or any(message.get("Status") != "success" for message in messages):
            logger.warning("Mailjet did not accept a password-reset message")
            return False
        return True
    except (MailerNotConfigured, httpx.HTTPError):
        logger.warning("Mailjet reset-email delivery is unavailable")
        return False
    except Exception:
        logger.warning("Mailjet reset-email delivery failed")
        return False

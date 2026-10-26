"""Mailjet v3.1 transactional delivery for password-reset messages."""
import html
import logging
import os
from urllib.parse import urlencode

import httpx

logger = logging.getLogger(__name__)
MAILJET_SEND_URL = "https://api.mailjet.com/v3.1/send"
RESET_LINK_LIFETIME_MINUTES = 60


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
        text_part = (
            "We received a request to reset your Smady password.\n\n"
            f"Choose a new password using this link (expires in {RESET_LINK_LIFETIME_MINUTES} minutes):\n"
            f"{reset_url}\n\n"
            "If you did not request this change, you can ignore this email. Your password will not change."
        )
        html_part = f"""<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <meta name="color-scheme" content="light">
        <title>Reset your Smady password</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#292524;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
            A password reset was requested for your Smady account.
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f5f4;padding:32px 12px;">
            <tr><td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;">
                    <tr><td style="padding:28px 32px 12px;">
                        <div style="font-size:22px;font-weight:700;letter-spacing:-0.4px;color:#292524;">Smady</div>
                    </td></tr>
                    <tr><td style="padding:12px 32px 32px;">
                        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#1c1917;">Reset your password</h1>
                        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#57534e;">We received a request to reset the password for your Smady account. Choose a new password using the button below.</p>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
                            <tr><td align="center" style="border-radius:8px;background:#ea580c;">
                                <a href="{safe_url}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:8px;">Reset password</a>
                            </td></tr>
                        </table>
                        <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#78716c;">This link expires in {RESET_LINK_LIFETIME_MINUTES} minutes and can only be used once.</p>
                        <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#78716c;">If the button does not work, copy and paste this address into your browser:</p>
                        <p style="margin:0 0 20px;word-break:break-all;font-size:12px;line-height:1.6;color:#c2410c;">{safe_url}</p>
                        <hr style="height:1px;border:0;background:#e7e5e4;margin:24px 0;">
                        <p style="margin:0;font-size:13px;line-height:1.6;color:#78716c;">If you did not request a password reset, you can ignore this email. Your password will not change.</p>
                    </td></tr>
                </table>
                <p style="max-width:560px;margin:16px auto 0;font-size:11px;line-height:1.5;color:#a8a29e;text-align:center;">This is an automated account-security message from Smady.</p>
            </td></tr>
        </table>
    </body>
</html>"""
        payload = {
            "Messages": [
                {
                    "From": {"Email": from_email, "Name": from_name},
                    "To": [{"Email": recipient}],
                    "Subject": "Reset your Smady password",
                    "TextPart": text_part,
                    "HTMLPart": html_part,
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

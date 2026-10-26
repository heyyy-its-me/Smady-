"""Transactional Gmail sender for account-recovery messages."""
import base64
import html
import logging
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import quote, urlencode
from email.message import EmailMessage

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from database import DB_SCHEMA
from models import google_mailer_accounts

logger = logging.getLogger(__name__)
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


class MailerNotConfigured(Exception):
    pass


def mailer_oauth_settings(require_frontend: bool = False) -> tuple[str, str, str, Fernet, str | None]:
    client_id = os.environ.get("GOOGLE_MAILER_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GOOGLE_MAILER_CLIENT_SECRET", "").strip()
    redirect_uri = os.environ.get("GOOGLE_MAILER_REDIRECT_URI", "").strip()
    encryption_key = os.environ.get("GOOGLE_TOKEN_ENCRYPTION_KEY", "").strip()
    frontend_url = os.environ.get("PUBLIC_FRONTEND_URL", "").strip().rstrip("/")
    if not all((client_id, client_secret, redirect_uri, encryption_key)) or (require_frontend and not frontend_url):
        raise MailerNotConfigured("Dedicated Google password-reset mailer client is not configured")
    try:
        cipher = Fernet(encryption_key.encode("ascii"))
    except (ValueError, UnicodeEncodeError):
        raise MailerNotConfigured("Google password-reset mailer encryption is invalid")
    return client_id, client_secret, redirect_uri, cipher, frontend_url or None


def encrypt_refresh_token(cipher: Fernet, token: str) -> str:
    return cipher.encrypt(token.encode("utf-8")).decode("ascii")


def decrypt_refresh_token(cipher: Fernet, token: str) -> str:
    try:
        return cipher.decrypt(token.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError, UnicodeEncodeError):
        raise MailerNotConfigured("Google mailer credentials cannot be decrypted")


async def get_mailer_access_token(db: AsyncSession) -> tuple[str, str]:
    client_id, client_secret, _redirect_uri, cipher, _frontend_url = mailer_oauth_settings()
    account = (await db.execute(
        select(google_mailer_accounts).where(google_mailer_accounts.c.id == 1)
    )).first()
    if not account:
        raise MailerNotConfigured("Google password-reset sender has not been connected")

    now = datetime.now(timezone.utc)
    if account.access_token_encrypted and account.token_expires_at and account.token_expires_at > now + timedelta(seconds=60):
        access_token = decrypt_refresh_token(cipher, account.access_token_encrypted)
        return access_token, account.email

    refresh_token = decrypt_refresh_token(cipher, account.refresh_token_encrypted)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
    except httpx.HTTPError:
        raise MailerNotConfigured("Google token service is unavailable")
    if response.status_code >= 400:
        raise MailerNotConfigured("Google mailer authorization expired or was revoked")
    try:
        data = response.json()
        access_token = data["access_token"]
        expires_at = now + timedelta(seconds=int(data.get("expires_in", 3600)))
    except (ValueError, KeyError, TypeError):
        raise MailerNotConfigured("Google returned an invalid token response")

    values = {
        "access_token_encrypted": encrypt_refresh_token(cipher, access_token),
        "token_expires_at": expires_at,
        "updated_at": now,
    }
    if data.get("refresh_token"):
        values["refresh_token_encrypted"] = encrypt_refresh_token(cipher, data["refresh_token"])
    await db.execute(update(google_mailer_accounts).where(google_mailer_accounts.c.id == 1).values(**values))
    await db.commit()
    return access_token, account.email


async def send_password_reset_email(db: AsyncSession, recipient: str, reset_token: str) -> bool:
    """Send a reset link. Never log the recipient, reset token, or provider response body."""
    try:
        _client_id, _client_secret, _redirect_uri, _cipher, frontend_url = mailer_oauth_settings(require_frontend=True)
        access_token, sender_email = await get_mailer_access_token(db)
        reset_url = f"{frontend_url}/reset-password?{urlencode({'token': reset_token})}"
        safe_url = html.escape(reset_url, quote=True)
        message = EmailMessage()
        message["To"] = recipient
        message["From"] = f"Smady <{sender_email}>"
        message["Subject"] = "Reset your Smady password"
        message.set_content(
            "We received a request to reset your Smady password.\n\n"
            f"Open this link within 60 minutes to choose a new password:\n{reset_url}\n\n"
            "If you did not request this, you can ignore this email."
        )
        message.add_alternative(
            "<p>We received a request to reset your Smady password.</p>"
            f'<p><a href="{safe_url}">Choose a new password</a></p>'
            "<p>This link expires in 60 minutes. If you did not request a reset, ignore this email.</p>",
            subtype="html",
        )
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode("ascii").rstrip("=")
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                GMAIL_SEND_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                json={"raw": raw},
            )
        if response.status_code >= 400:
            logger.warning("Password reset email delivery failed (Google returned HTTP %s)", response.status_code)
            return False
        return True
    except (MailerNotConfigured, httpx.HTTPError):
        logger.warning("Password reset email delivery is unavailable")
        return False
    except Exception:
        logger.warning("Password reset email delivery failed")
        return False

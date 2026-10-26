import logging
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from uuid import UUID

import httpx
import jwt
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from auth import (
    COOKIE_SAMESITE,
    COOKIE_SECURE,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_jwt_secret,
    get_optional_current_user,
    hash_password,
    set_auth_cookies,
)
from database import get_db
from models import customers, google_accounts, google_identities, google_mailer_accounts, users
from google_mailer import MailerNotConfigured, encrypt_refresh_token, mailer_oauth_settings
from webhooks import verify_callback_secret

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
GOOGLE_MAILER_USERINFO_URL = GOOGLE_USERINFO_URL
GOOGLE_IDENTITY_SCOPES = "openid email profile"
GOOGLE_INTEGRATION_SCOPES = (
    f"{GOOGLE_IDENTITY_SCOPES} "
    "https://www.googleapis.com/auth/gmail.send "
    "https://www.googleapis.com/auth/calendar.events.owned"
)
GOOGLE_STATE_COOKIE = "google_oauth_state"
GOOGLE_STATE_COOKIE_PATH = "/api/auth/google"

# OAuth start/callback and authenticated status/disconnect routes.
auth_router = APIRouter(prefix="/api/auth/google", tags=["Google OAuth"])
integration_router = APIRouter(prefix="/api/integrations/google", tags=["Google integration"])


class N8NTokenRequest(BaseModel):
    user_id: UUID


class OAuthFlowError(Exception):
    def __init__(self, code: str):
        self.code = code


def _mailer_setup_key() -> str:
    value = os.environ.get("GOOGLE_MAILER_SETUP_SECRET", "").strip()
    if len(value) < 64 or len(set(value)) < 16:
        raise HTTPException(status_code=503, detail="Google mailer setup is not configured")
    return value


def _mailer_state(nonce: str) -> str:
    return jwt.encode(
        {
            "type": "google_mailer_setup",
            "nonce": nonce,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
        },
        get_jwt_secret(),
        algorithm="HS256",
    )


@auth_router.post("/mailer/start")
async def google_mailer_start(
    x_mailer_setup_secret: str | None = Header(default=None, alias="X-Mailer-Setup-Secret"),
):
    expected = _mailer_setup_key()
    if not x_mailer_setup_secret or not hmac.compare_digest(x_mailer_setup_secret, expected):
        raise HTTPException(status_code=401, detail="Invalid mailer setup credential")
    try:
        client_id, _client_secret, mailer_redirect_uri, _cipher, _frontend_url = mailer_oauth_settings()
    except MailerNotConfigured as error:
        raise HTTPException(status_code=503, detail=str(error))

    state = _mailer_state(secrets.token_urlsafe(32))
    query = urlencode({
        "client_id": client_id,
        "redirect_uri": mailer_redirect_uri,
        "response_type": "code",
        "scope": f"{GOOGLE_IDENTITY_SCOPES} https://www.googleapis.com/auth/gmail.send",
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent select_account",
        "state": state,
    })
    return {"authorization_url": f"{GOOGLE_AUTH_URL}?{query}"}


def _google_settings(require_encryption: bool = False) -> tuple[str, str, str, Fernet | None]:
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
    redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI", "").strip()
    encryption_key = os.environ.get("GOOGLE_TOKEN_ENCRYPTION_KEY", "").strip()
    if not all((client_id, client_secret, redirect_uri)):
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    cipher = None
    if require_encryption:
        if not encryption_key:
            raise HTTPException(status_code=503, detail="Google integration encryption is not configured")
        try:
            cipher = Fernet(encryption_key.encode("ascii"))
        except (ValueError, UnicodeEncodeError):
            raise HTTPException(status_code=503, detail="Google integration encryption is not configured correctly")
    return client_id, client_secret, redirect_uri, cipher


def _encrypt_token(cipher: Fernet, token: str) -> str:
    return cipher.encrypt(token.encode("utf-8")).decode("ascii")


def _decrypt_token(cipher: Fernet, token: str) -> str:
    try:
        return cipher.decrypt(token.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError, UnicodeEncodeError):
        raise HTTPException(status_code=503, detail="Google credentials cannot be decrypted; reconnect Google")


def _encode_state(intent: str, nonce: str, user_id: str | None, return_to: str) -> str:
    payload = {
        "type": "google_oauth_state",
        "nonce": nonce,
        "intent": intent,
        "return_to": return_to if return_to in {"/login", "/signup"} else "/login",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    if user_id:
        payload["sub"] = user_id
    return jwt.encode(
        payload,
        get_jwt_secret(),
        algorithm="HS256",
    )


def _decode_state(state: str | None, cookie_nonce: str | None) -> dict:
    if not state or not cookie_nonce:
        raise OAuthFlowError("oauth_state_invalid")
    try:
        payload = jwt.decode(state, get_jwt_secret(), algorithms=["HS256"])
    except jwt.PyJWTError:
        raise OAuthFlowError("oauth_state_invalid")
    nonce = payload.get("nonce")
    if (
        payload.get("type") != "google_oauth_state"
        or not isinstance(nonce, str)
        or not secrets.compare_digest(nonce, cookie_nonce)
        or payload.get("intent") not in {"login", "connect"}
        or (payload.get("intent") == "connect" and not payload.get("sub"))
    ):
        raise OAuthFlowError("oauth_state_invalid")
    return payload


def _redirect(intent: str, return_to: str, reason: str | None = None) -> RedirectResponse:
    if reason:
        path = "/profile" if intent == "connect" else return_to
        destination = f"{path}?google=error&reason={reason}"
    else:
        destination = "/profile?google=connected" if intent == "connect" else "/dashboard?google=connected"
    response = RedirectResponse(destination, status_code=302)
    response.delete_cookie(
        GOOGLE_STATE_COOKIE,
        path=GOOGLE_STATE_COOKIE_PATH,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )
    return response


def _workspace_name(email: str) -> str:
    domain = email.rsplit("@", 1)[-1].lower()
    if domain in {"gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com"}:
        return "Personal workspace"
    return domain.split(".", 1)[0].replace("-", " ").replace("_", " ").title() or "Personal workspace"


@auth_router.get("/start")
async def google_start(
    intent: str = "login",
    return_to: str = "/login",
    user: dict | None = Depends(get_optional_current_user),
):
    if intent not in {"login", "connect"}:
        raise HTTPException(status_code=400, detail="Invalid Google OAuth intent")
    if intent == "connect" and not user:
        raise HTTPException(status_code=401, detail="Sign in before connecting Google")
    client_id, _client_secret, redirect_uri, _cipher = _google_settings(require_encryption=intent == "connect")
    nonce = secrets.token_urlsafe(32)
    state = _encode_state(intent, nonce, user["id"] if intent == "connect" else None, return_to)
    query = urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": GOOGLE_INTEGRATION_SCOPES if intent == "connect" else GOOGLE_IDENTITY_SCOPES,
            "include_granted_scopes": "true",
            "prompt": "consent select_account" if intent == "connect" else "select_account",
            "state": state,
        }
    )
    if intent == "connect":
        query += "&access_type=offline"
    response = RedirectResponse(f"{GOOGLE_AUTH_URL}?{query}", status_code=302)
    response.set_cookie(
        GOOGLE_STATE_COOKIE,
        nonce,
        max_age=600,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path=GOOGLE_STATE_COOKIE_PATH,
    )
    return response


@auth_router.get("/callback")
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    state_payload = None
    try:
        state_payload = _decode_state(
            request.query_params.get("state"),
            request.cookies.get(GOOGLE_STATE_COOKIE),
        )
        intent = state_payload["intent"]
        return_to = state_payload.get("return_to", "/login")
        if request.query_params.get("error"):
            raise OAuthFlowError("consent_denied")
        code = request.query_params.get("code")
        if not code:
            raise OAuthFlowError("oauth_code_missing")

        client_id, client_secret, redirect_uri, cipher = _google_settings(
            require_encryption=state_payload["intent"] == "connect"
        )
        async with httpx.AsyncClient(timeout=15) as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            if token_response.status_code >= 400:
                raise OAuthFlowError("token_exchange_failed")
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise OAuthFlowError("token_exchange_failed")
            userinfo_response = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_response.status_code >= 400:
                raise OAuthFlowError("google_profile_failed")
            profile = userinfo_response.json()

        email = profile.get("email", "").strip().lower()
        google_sub = profile.get("sub")
        if not email or not google_sub or profile.get("email_verified") is not True:
            raise OAuthFlowError("google_email_unverified")

        requested_user_id = state_payload.get("sub") if intent == "connect" else None
        existing_google = None
        account_by_user = None
        if intent == "connect":
            if cipher is None:
                raise OAuthFlowError("oauth_failed")
            existing_google = (await db.execute(
                select(google_accounts).where(google_accounts.c.google_sub == google_sub)
            )).first()
            if existing_google and str(existing_google.user_id) != requested_user_id:
                raise OAuthFlowError("google_account_in_use")
            linked_identity = (await db.execute(
                select(google_identities).where(google_identities.c.google_sub == google_sub)
            )).first()
            if linked_identity and str(linked_identity.user_id) != requested_user_id:
                raise OAuthFlowError("google_account_in_use")
            user_row = (await db.execute(
                select(users).where(users.c.id == requested_user_id)
            )).first()
            if not user_row:
                raise OAuthFlowError("account_not_found")
            email_owner = (await db.execute(select(users).where(users.c.email == email))).first()
            if email_owner and str(email_owner.id) != requested_user_id:
                raise OAuthFlowError("email_belongs_to_another_account")
        else:
            identity = (await db.execute(
                select(google_identities).where(google_identities.c.google_sub == google_sub)
            )).first()
            if identity:
                user_row = (await db.execute(select(users).where(users.c.id == identity.user_id))).first()
            else:
                # Support accounts created by the earlier combined sign-in/connect flow.
                legacy_account = (await db.execute(
                    select(google_accounts).where(google_accounts.c.google_sub == google_sub)
                )).first()
                user_row = (await db.execute(
                    select(users).where(users.c.id == legacy_account.user_id)
                )).first() if legacy_account else None
                if user_row:
                    await db.execute(insert(google_identities).values(
                        user_id=user_row.id, google_sub=google_sub, email=email
                    ))
            if not user_row:
                email_owner = (await db.execute(select(users).where(users.c.email == email))).first()
                user_row = email_owner
            if not user_row:
                customer_result = await db.execute(
                    insert(customers).values(name=_workspace_name(email)).returning(customers.c.id)
                )
                customer_id = customer_result.scalar_one()
                user_result = await db.execute(
                    insert(users).values(
                        email=email,
                        password_hash=hash_password(secrets.token_urlsafe(48)),
                        full_name=profile.get("name") or email.split("@", 1)[0],
                        customer_id=customer_id,
                        is_active=True,
                    ).returning(users)
                )
                user_row = user_result.first()
            identity = (await db.execute(
                select(google_identities).where(google_identities.c.google_sub == google_sub)
            )).first()
            if identity and str(identity.user_id) != str(user_row.id):
                raise OAuthFlowError("google_account_in_use")
            if not identity:
                identity_for_user = (await db.execute(
                    select(google_identities).where(google_identities.c.user_id == user_row.id)
                )).first()
                if identity_for_user and identity_for_user.google_sub != google_sub:
                    raise OAuthFlowError("another_google_identity_connected")
                await db.execute(insert(google_identities).values(
                    user_id=user_row.id, google_sub=google_sub, email=email
                ))

        if not user_row:
            raise OAuthFlowError("account_not_found")

        if intent == "login":
            await db.commit()
            response = _redirect(intent, return_to)
            set_auth_cookies(
                response,
                create_access_token(str(user_row.id), user_row.email),
                create_refresh_token(str(user_row.id)),
            )
            return response

        account_by_user = (await db.execute(
            select(google_accounts).where(google_accounts.c.user_id == user_row.id)
        )).first()
        if account_by_user and account_by_user.google_sub != google_sub:
            raise OAuthFlowError("another_google_account_connected")

        refresh_token = token_data.get("refresh_token")
        if not refresh_token and account_by_user:
            assert cipher is not None
            refresh_token = _decrypt_token(cipher, account_by_user.refresh_token_encrypted)
        if not refresh_token:
            raise OAuthFlowError("refresh_token_missing")

        expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(token_data.get("expires_in", 3600)))
        assert cipher is not None
        account_values = {
            "google_sub": google_sub,
            "email": email,
            "access_token_encrypted": _encrypt_token(cipher, access_token),
            "refresh_token_encrypted": _encrypt_token(cipher, refresh_token),
            "token_expires_at": expires_at,
            "scopes": token_data.get("scope") or (account_by_user.scopes if account_by_user else ""),
        }
        if account_by_user:
            await db.execute(
                update(google_accounts)
                .where(google_accounts.c.user_id == user_row.id)
                .values(**account_values)
            )
        else:
            await db.execute(insert(google_accounts).values(user_id=user_row.id, **account_values))
        await db.commit()

        response = _redirect(intent, return_to)
        return response
    except OAuthFlowError as error:
        await db.rollback()
        intent = state_payload.get("intent", "login") if state_payload else "login"
        return_to = state_payload.get("return_to", "/login") if state_payload else "/login"
        return _redirect(intent, return_to, error.code)
    except Exception:
        await db.rollback()
        logger.warning("Google OAuth callback failed")
        intent = state_payload.get("intent", "login") if state_payload else "login"
        return_to = state_payload.get("return_to", "/login") if state_payload else "/login"
        return _redirect(intent, return_to, "oauth_failed")


@auth_router.get("/mailer/callback", response_class=HTMLResponse)
async def google_mailer_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Complete the one-time authorization of Smady's transactional email sender."""
    try:
        state = request.query_params.get("state")
        code = request.query_params.get("code")
        if request.query_params.get("error") or not state or not code:
            raise OAuthFlowError("consent_denied")
        try:
            state_payload = jwt.decode(state, get_jwt_secret(), algorithms=["HS256"])
        except jwt.PyJWTError:
            raise OAuthFlowError("oauth_state_invalid")
        if state_payload.get("type") != "google_mailer_setup" or not isinstance(state_payload.get("nonce"), str):
            raise OAuthFlowError("oauth_state_invalid")

        try:
            client_id, client_secret, mailer_redirect_uri, cipher, _frontend_url = mailer_oauth_settings()
        except MailerNotConfigured:
            raise OAuthFlowError("mailer_not_configured")
        async with httpx.AsyncClient(timeout=15) as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": mailer_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            if token_response.status_code >= 400:
                raise OAuthFlowError("token_exchange_failed")
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")
            if not access_token or not refresh_token:
                raise OAuthFlowError("refresh_token_missing")
            profile_response = await client.get(
                GOOGLE_MAILER_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if profile_response.status_code >= 400:
                raise OAuthFlowError("google_profile_failed")
            profile = profile_response.json()

        email = profile.get("email", "").strip().lower()
        google_sub = profile.get("sub")
        if not email or not google_sub or profile.get("email_verified") is not True:
            raise OAuthFlowError("google_email_unverified")

        now = datetime.now(timezone.utc)
        values = {
            "google_sub": google_sub,
            "email": email,
            "access_token_encrypted": encrypt_refresh_token(cipher, access_token),
            "refresh_token_encrypted": encrypt_refresh_token(cipher, refresh_token),
            "token_expires_at": now + timedelta(seconds=int(token_data.get("expires_in", 3600))),
            "scopes": token_data.get("scope", ""),
            "updated_at": now,
        }
        existing = (await db.execute(
            select(google_mailer_accounts).where(google_mailer_accounts.c.id == 1)
        )).first()
        if existing:
            await db.execute(
                update(google_mailer_accounts).where(google_mailer_accounts.c.id == 1).values(**values)
            )
        else:
            await db.execute(insert(google_mailer_accounts).values(id=1, **values))
        await db.commit()
        return HTMLResponse(
            "<h1>Smady mailer connected</h1><p>Password-reset email delivery is authorized. You can close this window.</p>",
            headers={"Cache-Control": "no-store"},
        )
    except OAuthFlowError:
        await db.rollback()
        return HTMLResponse(
            "<h1>Mailer connection failed</h1><p>Return to your administrator and retry setup. No credentials were displayed.</p>",
            status_code=400,
            headers={"Cache-Control": "no-store"},
        )
    except Exception:
        await db.rollback()
        logger.warning("Google mailer OAuth callback failed")
        return HTMLResponse(
            "<h1>Mailer connection failed</h1><p>Return to your administrator and retry setup. No credentials were displayed.</p>",
            status_code=500,
            headers={"Cache-Control": "no-store"},
        )


@integration_router.get("/status")
async def google_status(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(
        select(google_accounts.c.email, google_accounts.c.scopes)
        .where(google_accounts.c.user_id == user["id"])
    )).first()
    return {
        "connected": bool(row),
        "email": row.email if row else None,
        "scopes": row.scopes.split() if row and row.scopes else [],
    }


@integration_router.delete("")
async def disconnect_google(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = (await db.execute(
        select(google_accounts).where(google_accounts.c.user_id == user["id"])
    )).first()
    if not row:
        return {"connected": False}

    try:
        _client_id, _client_secret, _redirect_uri, cipher = _google_settings(require_encryption=True)
        assert cipher is not None
        refresh_token = _decrypt_token(cipher, row.refresh_token_encrypted)
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(GOOGLE_REVOKE_URL, data={"token": refresh_token})
    except Exception:
        # Local disconnect still succeeds if Google revocation is temporarily unavailable.
        pass
    await db.execute(delete(google_accounts).where(google_accounts.c.user_id == user["id"]))
    await db.commit()
    return {"connected": False}


@integration_router.post("/n8n-token")
async def n8n_google_token(
    body: N8NTokenRequest,
    response: Response,
    x_callback_secret: str | None = Header(default=None, alias="X-Callback-Secret"),
    db: AsyncSession = Depends(get_db),
):
    verify_callback_secret(x_callback_secret)
    _client_id, client_secret, redirect_uri, cipher = _google_settings(require_encryption=True)
    assert cipher is not None
    row = (await db.execute(
        select(google_accounts).where(google_accounts.c.user_id == body.user_id)
    )).first()
    if not row:
        raise HTTPException(status_code=404, detail="Google is not connected for this user")

    now = datetime.now(timezone.utc)
    if row.access_token_encrypted and row.token_expires_at and row.token_expires_at > now + timedelta(seconds=60):
        access_token = _decrypt_token(cipher, row.access_token_encrypted)
        expires_at = row.token_expires_at
    else:
        refresh_token = _decrypt_token(cipher, row.refresh_token_encrypted)
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                token_response = await client.post(
                    GOOGLE_TOKEN_URL,
                    data={
                        "client_id": _client_id,
                        "client_secret": client_secret,
                        "refresh_token": refresh_token,
                        "grant_type": "refresh_token",
                    },
                )
        except httpx.HTTPError:
            raise HTTPException(status_code=502, detail="Google token service is unavailable")
        if token_response.status_code >= 400:
            if token_response.status_code == 400:
                raise HTTPException(status_code=409, detail="Google authorization expired; reconnect Google in Profile")
            raise HTTPException(status_code=502, detail="Google token refresh failed")
        try:
            token_data = token_response.json()
            access_token = token_data["access_token"]
        except (ValueError, KeyError, TypeError):
            raise HTTPException(status_code=502, detail="Google returned an invalid token response")
        expires_at = now + timedelta(seconds=int(token_data.get("expires_in", 3600)))
        values = {
            "access_token_encrypted": _encrypt_token(cipher, access_token),
            "token_expires_at": expires_at,
        }
        if token_data.get("refresh_token"):
            values["refresh_token_encrypted"] = _encrypt_token(cipher, token_data["refresh_token"])
        await db.execute(
            update(google_accounts).where(google_accounts.c.user_id == body.user_id).values(**values)
        )
        await db.commit()

    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_at": expires_at.isoformat(),
        "scope": row.scopes,
    }

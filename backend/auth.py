import os
import base64
import hashlib
import secrets
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import Request, HTTPException, Depends
from sqlalchemy import select, insert, update, case
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import users, login_attempts, customers

JWT_ALGORITHM = "HS256"
MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

# The frontend proxies /api same-origin (Vite dev proxy / Vercel rewrite), so cookies are
# first-party by default (Lax, Secure). Override via env only if you call the backend cross-origin.
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() != "false"
COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "lax")
REFRESH_COOKIE_PATH = "/api/auth"
APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
PASSWORD_MIN_LENGTH = 15
PASSWORD_MAX_LENGTH = 128
KNOWN_DEVELOPMENT_SECRETS = {
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
    "_-9876543210zyxwvutsrqponmlkjihgfedcbaZYXWVUTSRQPONMLKJIHGFEDCBA",
}


def get_jwt_secret() -> str:
    return _configured_secret("JWT_SECRET")


def _configured_secret(name: str) -> str:
    value = os.environ.get(name, "")
    has_short_repeating_pattern = any(
        all(value[index] == value[index % period] for index in range(period, len(value)))
        for period in range(1, min(32, len(value) // 2) + 1)
    )
    if len(value) < 64 or len(set(value)) < 16 or has_short_repeating_pattern:
        raise RuntimeError(
            f"{name} must be a securely generated value of at least 64 characters "
            "and must not be a short repeating pattern"
        )
    return value


def validate_security_configuration() -> None:
    """Fail startup rather than issue or accept tokens with weak/missing secrets."""
    jwt_secret = _configured_secret("JWT_SECRET")
    callback_secret = _configured_secret("N8N_CALLBACK_SECRET")
    if APP_ENV in {"production", "prod"} and (
        jwt_secret in KNOWN_DEVELOPMENT_SECRETS or callback_secret in KNOWN_DEVELOPMENT_SECRETS
    ):
        raise RuntimeError("Production secrets must not use known development or test values")
    if APP_ENV in {"production", "prod"} and os.environ.get("COOKIE_SECURE", "true").lower() != "true":
        raise RuntimeError("COOKIE_SECURE must be true in production")
    if COOKIE_SAMESITE not in {"lax", "strict", "none"}:
        raise RuntimeError("COOKIE_SAMESITE must be lax, strict, or none")
    if COOKIE_SAMESITE == "none" and not COOKIE_SECURE:
        raise RuntimeError("COOKIE_SECURE must be true when COOKIE_SAMESITE is none")


def validate_new_password(password: str) -> None:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise HTTPException(status_code=400, detail=f"Password must be at least {PASSWORD_MIN_LENGTH} characters")
    if len(password) > PASSWORD_MAX_LENGTH:
        raise HTTPException(status_code=400, detail=f"Password must be no more than {PASSWORD_MAX_LENGTH} characters")


def rate_limit_key(bucket: str, subject: str) -> str:
    digest = hashlib.sha256(subject.strip().lower().encode("utf-8")).hexdigest()
    return f"rate:{bucket}:{digest}"


async def enforce_rate_limit(db: AsyncSession, identifier: str, limit: int, window_seconds: int) -> None:
    """Atomically count requests in PostgreSQL, shared by all app instances."""
    now = datetime.now(timezone.utc)
    reset_before = now - timedelta(seconds=window_seconds)
    stmt = pg_insert(login_attempts).values(
        identifier=identifier,
        attempts=1,
        locked_until=None,
        updated_at=now,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["identifier"],
        set_={
            "attempts": case(
                (login_attempts.c.updated_at < reset_before, 1),
                else_=login_attempts.c.attempts + 1,
            ),
            "locked_until": None,
            "updated_at": now,
        },
    ).returning(login_attempts.c.attempts)
    result = await db.execute(stmt)
    attempts = result.scalar_one()
    await db.commit()
    if attempts > limit:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Try again later.",
            headers={"Retry-After": str(window_seconds)},
        )


def request_ip(request: Request) -> str:
    # Do not trust X-Forwarded-For here; only the ASGI server/proxy may set client.host.
    return request.client.host if request.client else "unknown"


PBKDF2_ITERATIONS = 210000


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + padding)


def hash_password(password: str) -> str:
    """Produces pbkdf2$<iterations>$<salt>$<hash> to match the existing production users."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS, dklen=32)
    return f"pbkdf2${PBKDF2_ITERATIONS}${_b64url_encode(salt)}${_b64url_encode(digest)}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if hashed_password.startswith("pbkdf2$"):
        try:
            _, iterations, salt_part, hash_part = hashed_password.split("$")
            salt = _b64url_decode(salt_part)
            expected = _b64url_decode(hash_part)
        except (ValueError, Exception):
            return False
        digest = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, int(iterations), dklen=len(expected))
        return secrets.compare_digest(digest, expected)
    if hashed_password.startswith("$2"):
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=3), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=10800, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=604800, path=REFRESH_COOKIE_PATH)


def clear_auth_cookies(response):
    response.delete_cookie("access_token", path="/", httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE)
    response.delete_cookie("refresh_token", path=REFRESH_COOKIE_PATH, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE)


def user_public(row, company: str | None = None) -> dict:
    return {
        "id": str(row.id),
        "name": row.full_name,
        "email": row.email,
        "company": company,
        "plan": "Pro Plan",
        "customer_id": str(row.customer_id) if row.customer_id else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


async def fetch_company_name(db: AsyncSession, customer_id) -> str | None:
    if not customer_id:
        return None
    result = await db.execute(select(customers.c.name).where(customers.c.id == customer_id))
    row = result.first()
    return row.name if row else None


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(users).where(users.c.id == payload["sub"]))
    row = result.first()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    company = await fetch_company_name(db, row.customer_id)
    return user_public(row, company)


async def get_optional_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> dict | None:
    """Authenticate browser callers when present; trusted webhook callers use their secret."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        return None
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(users).where(users.c.id == payload["sub"]))
    row = result.first()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    company = await fetch_company_name(db, row.customer_id)
    return user_public(row, company)


async def check_lockout(db: AsyncSession, identifier: str):
    result = await db.execute(select(login_attempts).where(login_attempts.c.identifier == identifier))
    row = result.first()
    if row and row.locked_until and row.locked_until > datetime.now(timezone.utc):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
    return row


async def record_failed_attempt(db: AsyncSession, identifier: str, existing_row):
    if existing_row:
        attempts = existing_row.attempts + 1
        locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES) if attempts >= MAX_ATTEMPTS else None
        await db.execute(
            update(login_attempts).where(login_attempts.c.identifier == identifier).values(attempts=attempts, locked_until=locked_until)
        )
    else:
        stmt = pg_insert(login_attempts).values(identifier=identifier, attempts=1)
        stmt = stmt.on_conflict_do_update(index_elements=["identifier"], set_={"attempts": login_attempts.c.attempts + 1})
        await db.execute(stmt)
    await db.commit()


async def clear_attempts(db: AsyncSession, identifier: str):
    await db.execute(update(login_attempts).where(login_attempts.c.identifier == identifier).values(attempts=0, locked_until=None))
    await db.commit()

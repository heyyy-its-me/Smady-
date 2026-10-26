from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, insert, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
import secrets
import jwt
import logging
from datetime import datetime, timezone, timedelta

from database import get_db
from google_mailer import send_password_reset_email
from models import users, password_reset_tokens, customers
from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, user_public, fetch_company_name, get_current_user,
    check_lockout, record_failed_attempt, clear_attempts, get_jwt_secret,
    COOKIE_SECURE, COOKIE_SAMESITE, validate_new_password, enforce_rate_limit,
    rate_limit_key, request_ip,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)


class SignupRequest(BaseModel):
    fullName: str
    email: EmailStr
    company: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


@router.post("/signup")
async def signup(body: SignupRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    email = body.email.lower()
    ip = request_ip(request)
    await enforce_rate_limit(db, rate_limit_key("signup-ip", ip), 10, 3600)
    await enforce_rate_limit(db, rate_limit_key("signup-email", email), 3, 3600)
    validate_new_password(body.password)
    try:
        customer_result = await db.execute(insert(customers).values(name=body.company).returning(customers))
        customer_row = customer_result.first()
        result = await db.execute(
            insert(users).values(
                email=email,
                password_hash=hash_password(body.password),
                full_name=body.fullName,
                customer_id=customer_row.id,
                is_active=True,
            ).returning(users)
        )
        row = result.first()
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    access_token = create_access_token(str(row.id), row.email)
    refresh_token = create_refresh_token(str(row.id))
    set_auth_cookies(response, access_token, refresh_token)
    return user_public(row, body.company)


@router.post("/login")
async def login(body: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    email = body.email.lower()
    await enforce_rate_limit(db, rate_limit_key("login-ip", request_ip(request)), 60, 300)
    identifier = email
    existing_attempt_row = await check_lockout(db, identifier)

    result = await db.execute(select(users).where(users.c.email == email))
    row = result.first()
    if not row or not verify_password(body.password, row.password_hash):
        await record_failed_attempt(db, identifier, existing_attempt_row)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await clear_attempts(db, identifier)
    access_token = create_access_token(str(row.id), row.email)
    refresh_token = create_refresh_token(str(row.id))
    set_auth_cookies(response, access_token, refresh_token)
    company = await fetch_company_name(db, row.customer_id)
    return user_public(row, company)


@router.post("/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"message": "Logged out"}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/refresh")
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    result = await db.execute(select(users).where(users.c.id == payload["sub"]))
    row = result.first()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    access_token = create_access_token(str(row.id), row.email)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=10800, path="/")
    return {"message": "Refreshed"}


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)):
    email = body.email.lower()
    ip = request_ip(request)
    await enforce_rate_limit(db, rate_limit_key("password-reset-ip", ip), 10, 3600)
    await enforce_rate_limit(db, rate_limit_key("password-reset-email", email), 5, 3600)
    result = await db.execute(select(users).where(users.c.email == email))
    row = result.first()
    if row:
        token = secrets.token_urlsafe(32)
        await db.execute(
            insert(password_reset_tokens).values(
                user_id=row.id, token=token, expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
            )
        )
        await db.commit()
        # Never log reset tokens, email addresses, or provider response data.
        await send_password_reset_email(db, email, token)
        logger.info("Password reset requested for an existing account")
    else:
        await db.commit()
    return {"message": "If an account exists and email delivery is configured, a reset link will be sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)):
    await enforce_rate_limit(db, rate_limit_key("password-reset-confirm-ip", request_ip(request)), 10, 900)
    validate_new_password(body.password)
    result = await db.execute(select(password_reset_tokens).where(password_reset_tokens.c.token == body.token))
    row = result.first()
    if not row or row.used or row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    await db.execute(update(users).where(users.c.id == row.user_id).values(password_hash=hash_password(body.password)))
    await db.execute(update(password_reset_tokens).where(password_reset_tokens.c.id == row.id).values(used=True))
    await db.commit()
    return {"message": "Password updated"}

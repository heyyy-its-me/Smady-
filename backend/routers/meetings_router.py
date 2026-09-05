from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select, insert
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from datetime import datetime
from database import get_db
from models import meetings, users
from auth import get_current_user
from webhooks import verify_callback_secret


def parse_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


class ScheduleMeetingRequest(BaseModel):
    lead_name: str
    lead_email: str
    meeting_date: str
    meeting_link: Optional[str] = None
    notes: Optional[str] = None


class MeetingCallbackRequest(BaseModel):
    request_id: Optional[str] = None
    customer_id: Optional[str] = None
    user_id: str
    lead_name: str
    lead_email: str
    meeting_date: str
    meeting_link: Optional[str] = None


def serialize(row):
    return {
        "id": str(row.id),
        "user_id": str(row.user_id),
        "request_id": str(row.request_id) if row.request_id else None,
        "lead_name": row.lead_name,
        "lead_email": row.lead_email,
        "meeting_date": row.meeting_date.isoformat() if row.meeting_date else None,
        "meeting_link": row.meeting_link,
        "status": row.status,
        "source": row.source,
        "notes": row.notes,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("")
async def list_meetings(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(meetings).where(meetings.c.user_id == user["id"]).order_by(meetings.c.meeting_date.asc())
    )
    return [serialize(r) for r in result.fetchall()]


@router.post("/schedule")
async def schedule_meeting(body: ScheduleMeetingRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        insert(meetings).values(
            user_id=user["id"],
            lead_name=body.lead_name,
            lead_email=body.lead_email,
            meeting_date=parse_dt(body.meeting_date),
            meeting_link=body.meeting_link,
            notes=body.notes,
            status="Confirmed",
            source="manual",
        ).returning(meetings)
    )
    row = result.first()
    await db.commit()
    return serialize(row)


@router.post("/callback")
async def meeting_callback(body: MeetingCallbackRequest, x_callback_secret: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)):
    verify_callback_secret(x_callback_secret)
    try:
        user_uuid = uuid.UUID(body.user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    user_check = await db.execute(select(users.c.id).where(users.c.id == user_uuid))
    if not user_check.first():
        raise HTTPException(status_code=404, detail="Unknown user_id — refusing to record meeting")

    result = await db.execute(
        insert(meetings).values(
            user_id=user_uuid,
            request_id=body.request_id,
            lead_name=body.lead_name,
            lead_email=body.lead_email,
            meeting_date=parse_dt(body.meeting_date),
            meeting_link=body.meeting_link,
            status="Auto-Booked",
            source="agent",
        ).returning(meetings)
    )
    row = result.first()
    await db.commit()
    return serialize(row)


@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        meeting_uuid = uuid.UUID(meeting_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Meeting not found")
    result = await db.execute(
        select(meetings).where(meetings.c.id == meeting_uuid, meetings.c.user_id == user["id"])
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return serialize(row)

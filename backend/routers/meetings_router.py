from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, field_validator
from typing import Optional
from sqlalchemy import select, insert, update, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import re
import logging

from datetime import datetime, timedelta, timezone
from database import get_db
from models import meetings, users
from auth import get_current_user
from webhooks import verify_callback_secret, trigger_webhook, is_webhook_configured

logger = logging.getLogger(__name__)
MEETING_DURATION = timedelta(minutes=30)

# IST offset in hours (fixed, no DST)
IST_OFFSET = "+05:30"


def parse_dt(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid meeting_date format")

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


async def _has_conflict(db: AsyncSession, user_id, start_dt: datetime) -> bool:
    """Meetings are assumed to occupy a fixed 30-min slot (no duration field on the table yet)."""
    end_dt = start_dt + MEETING_DURATION
    result = await db.execute(
        select(meetings.c.meeting_date).where(meetings.c.user_id == user_id, meetings.c.status != "Cancelled")
    )
    for row in result.fetchall():
        existing_end = row.meeting_date + MEETING_DURATION
        if row.meeting_date < end_dt and start_dt < existing_end:
            return True
    return False


class ScheduleMeetingRequest(BaseModel):
    lead_name: str
    lead_email: str
    meeting_date: str          # ISO date "YYYY-MM-DD"
    meeting_time: Optional[str] = None   # 24hr "HH:mm" (IST), optional for backward compat
    duration: Optional[int] = 30         # minutes
    title: Optional[str] = "Discovery Call"
    meeting_link: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("meeting_time")
    @classmethod
    def validate_time_format(cls, v):
        if v is not None and not re.match(r"^\d{1,2}:\d{2}$", v):
            raise ValueError("meeting_time must be HH:mm (24-hour, IST)")
        return v


class MeetingCallbackRequest(BaseModel):
    request_id: Optional[str] = None
    customer_id: Optional[str] = None
    user_id: str
    lead_name: str
    lead_email: str
    meeting_date: str
    meeting_link: Optional[str] = None


class UpdateMeetingStatusRequest(BaseModel):
    lead_email: str
    meeting_date: str
    status: str  # "Scheduled", "Failed", "Cancelled", etc.


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
    """
    Schedule a meeting manually.

    If meeting_time is supplied alongside a date-only meeting_date, we combine them
    into a proper IST datetime and convert to UTC for storage.
    The same combined datetime is forwarded to the n8n book-slot webhook (if configured)
    using the EXACT field names the n8n form expects.
    """
    # Parse meeting_date — accept both ISO datetime and date-only
    raw_date = body.meeting_date.strip()

    if body.meeting_time and re.match(r"^\d{4}-\d{2}-\d{2}$", raw_date):
        # Combine date + time (IST) → UTC
        combined_str = f"{raw_date}T{body.meeting_time}:00{IST_OFFSET}"
        meeting_dt = parse_dt(combined_str)
    else:
        meeting_dt = parse_dt(raw_date)

    if await _has_conflict(db, user["id"], meeting_dt):
        raise HTTPException(status_code=409, detail="This time slot is already booked. Please choose a different time.")

    # Save to public.meetings
    result = await db.execute(
        insert(meetings).values(
            user_id=user["id"],
            lead_name=body.lead_name,
            lead_email=body.lead_email,
            meeting_date=meeting_dt,
            meeting_link=body.meeting_link,
            notes=body.notes or f"Meeting scheduled manually with {body.lead_name}",
            status="Pending Reply",
            source="manual",
        ).returning(meetings)
    )
    row = result.first()
    await db.commit()
    serialized = serialize(row)

    # Fire n8n book-slot webhook — same fields as the n8n manual booking form
    if is_webhook_configured("meetings"):
        n8n_payload = {
            "Client Name": body.lead_name,
            "Client Email": body.lead_email,
            "Meeting Date": raw_date if re.match(r"^\d{4}-\d{2}-\d{2}$", raw_date) else meeting_dt.strftime("%Y-%m-%d"),
            "Meeting Time (24hr, IST)": body.meeting_time or meeting_dt.astimezone(timezone.utc).strftime("%H:%M"),
            "Duration (minutes)": body.duration or 30,
            "Meeting Title": body.title or "Discovery Call",
            "Notes / Description": body.notes or f"Meeting scheduled manually with {body.lead_name}",
        }
        await trigger_webhook("meetings", n8n_payload)
        logger.info("n8n book-slot webhook triggered for %s", body.lead_email)

    return serialized


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


@router.put("/update-status")
async def update_meeting_status(
    body: UpdateMeetingStatusRequest,
    x_callback_secret: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """Update meeting status (used by N8N to mark as Scheduled or Failed)."""
    verify_callback_secret(x_callback_secret)
    
    # Parse meeting_date
    meeting_date = parse_dt(body.meeting_date) if "T" in body.meeting_date else parse_dt(f"{body.meeting_date}T00:00:00+00:00")
    
    result = await db.execute(
        update(meetings)
        .where(
            (meetings.c.lead_email == body.lead_email) &
            (meetings.c.status != "Cancelled")
        )
        .values(status=body.status, updated_at=func.now())
        .returning(meetings)
    )
    row = result.first()
    await db.commit()
    
    if not row:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    logger.info("Meeting status updated to %s for %s", body.status, body.lead_email)
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

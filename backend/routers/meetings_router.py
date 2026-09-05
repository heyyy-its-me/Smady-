from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select, insert, update
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import uuid

from database import get_db
from models import meetings, propmeetings, lead_results
from auth import get_current_user
from webhooks import trigger_webhook_get, is_webhook_configured, verify_callback_secret, get_callback_url

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

TERMINAL_OUTCOMES = {"Confirmed", "Auto-Booked"}
IST = ZoneInfo("Asia/Kolkata")


class ScheduleMeetingRequest(BaseModel):
    lead_id: Optional[str] = None
    client_name: str
    client_email: str
    meeting_date: str
    meeting_time: str
    duration_minutes: int = 30
    meeting_title: str
    notes: Optional[str] = None


class MeetingCallbackRequest(BaseModel):
    request_id: Optional[str] = None
    meet_link: Optional[str] = None
    lead_email: Optional[str] = None
    lead_name: Optional[str] = None
    company: Optional[str] = None
    outcome: str = "Confirmed"
    start_time: Optional[str] = None
    notes: Optional[str] = None
    recording_url: Optional[str] = None
    transcript: Optional[str] = None
    ai_summary: Optional[str] = None
    event_id: Optional[str] = None
    fireflies_meeting_id: Optional[str] = None
    proposal_status: Optional[str] = None
    customer_id: Optional[str] = None
    user_id: Optional[str] = None


def serialize_meeting(row):
    meeting_date = row.meeting_date
    return {
        "id": str(row.id),
        "leadName": row.lead_name or "Unknown",
        "company": row.company or "",
        "date": meeting_date.astimezone(IST).date().isoformat() if meeting_date else "",
        "time": meeting_date.astimezone(IST).strftime("%I:%M %p") if meeting_date else "",
        "status": row.outcome,
        "link": row.meet_link or row.meeting_link or "#",
    }


@router.get("")
async def list_meetings(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(meetings).where(meetings.c.user_id == user["id"]).order_by(meetings.c.created_at.desc()))
    return [serialize_meeting(r) for r in result.fetchall()]


@router.post("/schedule")
async def schedule_meeting(body: ScheduleMeetingRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        hour, minute = map(int, body.meeting_time.split(":"))
        year, month, day = map(int, body.meeting_date.split("-"))
        meeting_dt_ist = datetime(year, month, day, hour, minute, tzinfo=IST)
        meeting_dt_utc = meeting_dt_ist.astimezone(timezone.utc)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="meeting_date must be YYYY-MM-DD and meeting_time must be HH:MM (24hr)")

    company = None
    if body.lead_id:
        lead_result = await db.execute(select(lead_results).where(lead_results.c.id == body.lead_id, lead_results.c.user_id == user["id"]))
        lead_row = lead_result.first()
        if lead_row:
            company = lead_row.company

    request_id = uuid.uuid4()
    configured = is_webhook_configured("meetings")

    await db.execute(
        insert(meetings).values(
            user_id=user["id"], customer_id=user["id"], lead_id=body.lead_id, request_id=request_id,
            lead_name=body.client_name, company=company, meeting_date=meeting_dt_utc, duration=body.duration_minutes,
            notes=body.notes, outcome="Pending Reply",
        )
    )
    await db.commit()

    if configured:
        await trigger_webhook_get("meetings", {
            "request_id": str(request_id),
            "client_name": body.client_name,
            "client_email": body.client_email,
            "meeting_date": body.meeting_date,
            "meeting_time": body.meeting_time,
            "duration_minutes": body.duration_minutes,
            "meeting_title": body.meeting_title,
            "notes": body.notes or "",
            "callback_url": get_callback_url("/api/meetings/callback"),
        })
    return {"request_id": str(request_id), "status": "pending" if configured else "webhook_not_configured"}


@router.get("/status/{request_id}")
async def get_meeting_status(request_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(meetings).where(meetings.c.request_id == request_id, meetings.c.user_id == user["id"]))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Meeting request not found")
    status = "pending" if row.outcome not in TERMINAL_OUTCOMES else row.outcome
    return {"request_id": str(row.request_id), "status": status, "meeting": serialize_meeting(row)}


@router.post("/callback")
async def meeting_callback(body: MeetingCallbackRequest, x_callback_secret: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)):
    verify_callback_secret(x_callback_secret)
    if not body.request_id and not body.meet_link:
        raise HTTPException(status_code=400, detail="Either request_id or meet_link is required")

    row = None
    if body.request_id:
        result = await db.execute(select(meetings).where(meetings.c.request_id == body.request_id))
        row = result.first()
    if not row and body.meet_link:
        result = await db.execute(select(meetings).where(meetings.c.meet_link == body.meet_link))
        row = result.first()

    start_time = None
    if body.start_time:
        try:
            start_time = datetime.fromisoformat(body.start_time)
        except ValueError:
            start_time = None

    if row:
        update_values = {"outcome": body.outcome, "meet_link": body.meet_link or row.meet_link}
        if start_time:
            update_values["meeting_date"] = start_time
        if body.notes:
            update_values["notes"] = body.notes
        if body.recording_url:
            update_values["recording_url"] = body.recording_url
        if body.transcript:
            update_values["transcript"] = body.transcript
        if body.ai_summary:
            update_values["ai_summary"] = body.ai_summary
        if body.lead_name:
            update_values["lead_name"] = body.lead_name
        if body.company:
            update_values["company"] = body.company
        await db.execute(update(meetings).where(meetings.c.id == row.id).values(**update_values))
        user_id, customer_id, meet_link = row.user_id, row.customer_id, (body.meet_link or row.meet_link)
    else:
        if not body.customer_id and not body.user_id:
            raise HTTPException(status_code=400, detail="customer_id or user_id is required to create a new auto-booked meeting")
        user_id = body.user_id or body.customer_id
        customer_id = body.customer_id or body.user_id
        insert_result = await db.execute(
            insert(meetings).values(
                user_id=user_id, customer_id=customer_id, lead_name=body.lead_name, company=body.company,
                meeting_date=start_time, meet_link=body.meet_link, meeting_link=body.meet_link,
                outcome=body.outcome, notes=body.notes, recording_url=body.recording_url,
                transcript=body.transcript, ai_summary=body.ai_summary,
            ).returning(meetings.c.id)
        )
        row_id = insert_result.first().id
        meet_link = body.meet_link

    if meet_link and (body.fireflies_meeting_id or body.proposal_status or body.event_id):
        existing = await db.execute(select(propmeetings).where(propmeetings.c.meet_link == meet_link))
        existing_row = existing.first()
        pm_values = {
            "customer_id": customer_id, "user_id": user_id, "lead_email": body.lead_email,
            "event_id": body.event_id, "start_time": start_time, "status": body.outcome,
            "fireflies_meeting_id": body.fireflies_meeting_id, "proposal_status": body.proposal_status,
        }
        if existing_row:
            await db.execute(update(propmeetings).where(propmeetings.c.meet_link == meet_link).values(**pm_values))
        else:
            await db.execute(insert(propmeetings).values(meet_link=meet_link, **pm_values))

    await db.commit()
    return {"message": "Meeting updated"}

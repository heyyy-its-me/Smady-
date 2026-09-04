from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy import select, insert, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, date, timedelta
import uuid

from database import get_db
from models import outreach_campaigns, outreach_emails, leads
from auth import get_current_user
from webhooks import trigger_webhook, is_webhook_configured, verify_callback_secret

router = APIRouter(prefix="/api/outreach", tags=["outreach"])


class CampaignCreateRequest(BaseModel):
    name: str
    subject: str
    body: str
    recipientSource: str = "all"


class EmailEvent(BaseModel):
    lead_id: Optional[str] = None
    email: str
    status: str


class CampaignCallbackRequest(BaseModel):
    request_id: str
    status: str
    emails: List[EmailEvent] = []


def serialize_campaign(row):
    return {
        "id": str(row.id),
        "requestId": f"#{str(row.request_id)[:8].upper()}",
        "name": row.name,
        "leadsCount": row.leads_count,
        "status": row.status,
        "sentDate": row.sent_date.isoformat() if row.sent_date else "",
        "subject": row.subject,
        "body": row.body,
    }


@router.get("/campaigns")
async def list_campaigns(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(outreach_campaigns).where(outreach_campaigns.c.user_id == user["id"]).order_by(outreach_campaigns.c.created_at.desc())
    )
    return [serialize_campaign(r) for r in result.fetchall()]


@router.post("/campaigns")
async def create_campaign(body: CampaignCreateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    count_result = await db.execute(
        select(func.count()).select_from(leads).where(leads.c.user_id == user["id"], leads.c.status.in_(["New", "Verified", "Contacted"]))
    )
    leads_count = count_result.scalar() or 0

    request_id = uuid.uuid4()
    configured = is_webhook_configured("outreach")
    status = "Queued" if configured else "Failed"
    result = await db.execute(
        insert(outreach_campaigns).values(
            user_id=user["id"], request_id=request_id, name=body.name, leads_count=leads_count,
            status=status, subject=body.subject, body=body.body,
            sent_date=date.today() if configured else None,
        ).returning(outreach_campaigns)
    )
    row = result.first()
    await db.commit()

    if configured:
        leads_result = await db.execute(
            select(leads).where(leads.c.user_id == user["id"], leads.c.status.in_(["New", "Verified", "Contacted"]))
        )
        recipient_leads = [{"lead_id": str(l.id), "email": l.email, "name": l.name} for l in leads_result.fetchall()]
        await trigger_webhook("outreach", {
            "request_id": str(request_id), "user_id": user["id"],
            "subject": body.subject, "body": body.body, "leads": recipient_leads,
        })
    return serialize_campaign(row)


@router.post("/callback")
async def outreach_callback(body: CampaignCallbackRequest, x_callback_secret: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)):
    verify_callback_secret(x_callback_secret)
    result = await db.execute(select(outreach_campaigns).where(outreach_campaigns.c.request_id == body.request_id))
    campaign_row = result.first()
    if not campaign_row:
        raise HTTPException(status_code=404, detail="Campaign not found")

    now = datetime.now(timezone.utc)
    for item in body.emails:
        ts_field = {"sent": "sent_at", "opened": "opened_at", "replied": "replied_at", "bounced": "bounced_at"}.get(item.status)
        values = {"campaign_id": campaign_row.id, "lead_id": item.lead_id, "email": item.email, "status": item.status}
        if ts_field:
            values[ts_field] = now
        await db.execute(insert(outreach_emails).values(**values))

    update_values = {"status": body.status}
    if body.status == "Sent":
        update_values["sent_date"] = date.today()
    await db.execute(update(outreach_campaigns).where(outreach_campaigns.c.request_id == body.request_id).values(**update_values))
    await db.commit()
    return {"message": f"{len(body.emails)} email events recorded"}


@router.get("/stats")
async def outreach_stats(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    campaign_ids_result = await db.execute(select(outreach_campaigns.c.id).where(outreach_campaigns.c.user_id == user["id"]))
    campaign_ids = [r.id for r in campaign_ids_result.fetchall()]
    if not campaign_ids:
        empty = {"value": 0, "sparkline": [0, 0, 0, 0, 0, 0, 0]}
        return {"emailsSent": empty, "openRate": empty, "replyRate": empty, "bounceRate": empty, "weeklyEmailsSent": []}

    async def count_status(status: str) -> int:
        r = await db.execute(
            select(func.count()).select_from(outreach_emails).where(outreach_emails.c.campaign_id.in_(campaign_ids), outreach_emails.c.status == status)
        )
        return r.scalar() or 0

    sent = await count_status("sent")
    opened = await count_status("opened")
    replied = await count_status("replied")
    bounced = await count_status("bounced")
    denom = sent or 1

    daily_result = await db.execute(
        select(func.date(outreach_emails.c.created_at).label("d"), func.count().label("c"))
        .where(outreach_emails.c.campaign_id.in_(campaign_ids), outreach_emails.c.status == "sent")
        .group_by(func.date(outreach_emails.c.created_at))
    )
    daily_map = {str(r.d): r.c for r in daily_result.fetchall()}
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    today = date.today()
    weekly = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        weekly.append({"label": days[d.weekday()], "value": daily_map.get(str(d), 0)})

    return {
        "emailsSent": {"value": sent, "sparkline": [w["value"] for w in weekly]},
        "openRate": {"value": round(opened / denom * 100), "sparkline": [0] * 7},
        "replyRate": {"value": round(replied / denom * 100), "sparkline": [0] * 7},
        "bounceRate": {"value": round(bounced / denom * 100), "sparkline": [0] * 7},
        "weeklyEmailsSent": weekly,
    }

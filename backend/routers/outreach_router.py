from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy import select, insert, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, date, timedelta
import uuid
import logging

from database import get_db
from models import outreach_campaigns, outreach_emails, lead_results
from auth import get_current_user
from webhooks import trigger_webhook, is_webhook_configured, verify_callback_secret
from routers.leads_router import _normalize_lead

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/outreach", tags=["outreach"])


async def _eligible_leads(db: AsyncSession, user_id: str, run_id: Optional[str] = None):
    """Recipients live in the real public.lead_results (not the legacy smady.leads table).
    Pass run_id to scope to one specific execution instead of all of the user's leads ever."""
    query = select(lead_results).where(lead_results.c.user_id == user_id)
    if run_id:
        query = query.where(lead_results.c.request_id == run_id)
    result = await db.execute(query)
    out = []
    for row in result.fetchall():
        for i, item in enumerate(row.leads or []):
            lead = _normalize_lead(item, row.request_id, i)
            if lead["status"] in ("New", "Verified", "Contacted") and lead["email"]:
                out.append(lead)
    return out


class CampaignCreateRequest(BaseModel):
    name: str
    subject: str
    body: str
    recipientSource: str = "all"
    runId: Optional[str] = None


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
    eligible = await _eligible_leads(db, user["id"], run_id=body.runId if body.recipientSource == "run" else None)
    leads_count = len(eligible)

    request_id = uuid.uuid4()
    configured = is_webhook_configured("outreach")
    status = "Queued" if configured else "Failed"
    result = await db.execute(
        insert(outreach_campaigns).values(
            user_id=user["id"], customer_id=user["customer_id"], request_id=request_id, name=body.name, leads_count=leads_count,
            status=status, subject=body.subject, body=body.body,
            sent_date=date.today() if configured else None,
        ).returning(outreach_campaigns)
    )
    row = result.first()
    await db.commit()

    if configured:
        # Send full normalized lead objects with all enrichment fields (Lead Score, ICP Match, etc.)
        # N8N outreach workflow uses these fields to compose personalized emails
        recipient_leads = eligible  # l already has 30+ fields from _normalize_lead()
        webhook_ok = await trigger_webhook("outreach", {
            "campaign_id": str(row.id),  # Include campaign_id for email logging
            "request_id": str(request_id), "user_id": user["id"],
            "subject": body.subject, "body": body.body, "leads": recipient_leads,
        })
        if not webhook_ok:
            await db.execute(update(outreach_campaigns).where(outreach_campaigns.c.request_id == request_id).values(status="Failed"))
            await db.commit()
            row = (await db.execute(select(outreach_campaigns).where(outreach_campaigns.c.request_id == request_id))).first()
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


@router.post("/log-emails")
async def log_emails_sent(
    body: dict,
    x_callback_secret: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Log emails sent from n8n to outreach_emails table.
    This endpoint allows n8n to record emails sent directly (not via campaigns).
    
    POST body (OPTION 1 - with campaign_id):
    {
      "campaign_id": "uuid",
      "emails": [
        {"email": "test@example.com", "lead_id": "123", "status": "sent"},
        ...
      ]
    }
    
    POST body (OPTION 2 - each email has campaign_id):
    {
      "emails": [
        {"email": "test@example.com", "lead_id": "123", "campaign_id": "uuid", "status": "sent"},
        ...
      ]
    }
    
    POST body (OPTION 3 - batch without campaign, just log):
    {
      "emails": [
        {"email": "test@example.com", "lead_id": "123", "status": "sent"},
        ...
      ]
    }
    """
    try:
        if x_callback_secret:
            verify_callback_secret(x_callback_secret)
    except Exception as e:
        logger.warning(f"Webhook secret verification failed: {e}")
        # Don't fail here - webhook secret is optional
    
    # Validate body structure
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Request body must be JSON object")
    
    emails = body.get("emails", [])
    campaign_id = body.get("campaign_id")
    
    if not emails or not isinstance(emails, list):
        raise HTTPException(status_code=400, detail="'emails' must be a list of email objects")
    
    if len(emails) == 0:
        return {"logged": 0, "total": 0, "message": "No emails to log"}
    
    logged_count = 0
    errors = []
    
    for idx, email_data in enumerate(emails):
        try:
            if not isinstance(email_data, dict):
                errors.append(f"Item {idx}: not a dict")
                continue
            
            # Get campaign_id from email or parent level
            email_campaign_id = email_data.get("campaign_id") or campaign_id
            email_addr = email_data.get("email", "").strip()
            lead_id = email_data.get("lead_id", "").strip()
            status = email_data.get("status", "sent").strip().lower()
            
            if not email_addr:
                errors.append(f"Item {idx}: missing 'email' field")
                continue
            
            # Build email record - campaign_id CAN be None (it's nullable in DB)
            email_obj = {
                "id": uuid.uuid4(),
                "campaign_id": email_campaign_id,  # Can be None - that's OK
                "lead_id": lead_id if lead_id else None,
                "email": email_addr,
                "status": status,
                "created_at": datetime.now(timezone.utc),
            }
            
            # Set appropriate timestamp based on status
            if status == "sent":
                email_obj["sent_at"] = datetime.now(timezone.utc)
            elif status == "opened":
                email_obj["opened_at"] = datetime.now(timezone.utc)
            elif status == "replied":
                email_obj["replied_at"] = datetime.now(timezone.utc)
            elif status == "bounced":
                email_obj["bounced_at"] = datetime.now(timezone.utc)
            
            await db.execute(insert(outreach_emails).values(**email_obj))
            logged_count += 1
        except Exception as e:
            logger.error(f"Failed to log email at index {idx}: {str(e)}", exc_info=True)
            errors.append(f"Item {idx}: {str(e)}")
    
    # Commit all changes at once
    try:
        await db.commit()
    except Exception as e:
        logger.error(f"Database commit failed: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during commit: {str(e)}")
    
    response = {
        "logged": logged_count,
        "total": len(emails),
        "message": f"Logged {logged_count}/{len(emails)} emails"
    }
    
    if errors:
        response["errors"] = errors
    
    return response

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from sqlalchemy import select, insert, update
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
import uuid

from database import get_db
from models import proposal_review_log, proposals, lead_results
from auth import get_current_user
from webhooks import trigger_webhook, is_webhook_configured, verify_callback_secret, get_callback_url

router = APIRouter(prefix="/api/proposals", tags=["proposals"])

TERMINAL_STATUSES = {"Needs Review", "Approved", "Sent", "Rejected"}


class GenerateProposalRequest(BaseModel):
    lead_id: Optional[str] = None
    leadName: str
    company: str
    notes: str = ""


class ProposalCallbackRequest(BaseModel):
    request_id: str
    lead_name: Optional[str] = None
    lead_email: Optional[str] = None
    company: Optional[str] = None
    content: Optional[str] = None
    proposal_json: Optional[Dict[str, Any]] = None
    guardrail_errors: List[str] = []
    reviewer_approved: bool = False
    reviewer_issues: List[str] = []


def serialize_proposal(row):
    return {
        "id": str(row.id),
        "leadName": row.lead_name or "Unknown",
        "company": row.company or "",
        "generatedDate": row.created_at.date().isoformat() if row.created_at else "",
        "status": row.final_status,
        "content": row.content or "",
    }


@router.get("/pending")
async def list_pending(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(proposal_review_log)
        .where(proposal_review_log.c.user_id == user["id"], proposal_review_log.c.final_status.in_(list(TERMINAL_STATUSES)))
        .order_by(proposal_review_log.c.created_at.desc())
    )
    return [serialize_proposal(r) for r in result.fetchall()]


@router.post("/generate")
async def generate_proposal(body: GenerateProposalRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    lead_email = None
    if body.lead_id:
        lead_result = await db.execute(select(lead_results).where(lead_results.c.id == body.lead_id, lead_results.c.user_id == user["id"]))
        lead_row = lead_result.first()
        if lead_row:
            lead_email = lead_row.email

    request_id = uuid.uuid4()
    configured = is_webhook_configured("proposals")
    await db.execute(
        insert(proposal_review_log).values(
            request_id=request_id, user_id=user["id"], customer_id=user["id"],
            lead_name=body.leadName, company=body.company, lead_email=lead_email,
            final_status="pending" if configured else "webhook_not_configured",
        )
    )
    await db.commit()
    if configured:
        await trigger_webhook("proposals", {
            "request_id": str(request_id), "customer_id": user["id"], "user_id": user["id"],
            "callback_url": get_callback_url("/api/proposals/callback"),
            "lead_email": lead_email, "lead_name": body.leadName,
            "proposal_template": "Standard Growth Package", "key_points": body.notes,
        })
    return {"request_id": str(request_id), "status": "pending" if configured else "webhook_not_configured"}


@router.get("/status/{request_id}")
async def get_proposal_status(request_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(proposal_review_log).where(proposal_review_log.c.request_id == request_id, proposal_review_log.c.user_id == user["id"]))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Proposal request not found")
    status = row.final_status if row.final_status in TERMINAL_STATUSES or row.final_status == "webhook_not_configured" else "pending"
    return {"request_id": str(row.request_id), "status": status, "proposal": serialize_proposal(row)}


@router.post("/callback")
async def proposal_callback(body: ProposalCallbackRequest, x_callback_secret: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)):
    verify_callback_secret(x_callback_secret)
    result = await db.execute(select(proposal_review_log).where(proposal_review_log.c.request_id == body.request_id))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Proposal request not found")

    final_status = "Sent" if body.reviewer_approved else "Needs Review"
    await db.execute(
        update(proposal_review_log).where(proposal_review_log.c.request_id == body.request_id).values(
            final_status=final_status, content=body.content,
            lead_name=body.lead_name or row.lead_name, company=body.company or row.company,
            lead_email=body.lead_email or row.lead_email, proposal_json=body.proposal_json,
            guardrail_errors=body.guardrail_errors, reviewer_approved=body.reviewer_approved,
            reviewer_issues=body.reviewer_issues,
        )
    )
    if body.reviewer_approved:
        await db.execute(
            insert(proposals).values(
                user_id=row.user_id, customer_id=row.customer_id, lead_name=body.lead_name or row.lead_name,
                company=body.company or row.company, proposal_status="Sent", sent_date=date.today(),
                ai_generated=True, metadata={"content": body.content},
            )
        )
    await db.commit()
    return {"message": "Proposal updated"}


@router.post("/{proposal_id}/approve")
async def approve_proposal(proposal_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(proposal_review_log).where(proposal_review_log.c.id == proposal_id, proposal_review_log.c.user_id == user["id"]))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Proposal not found")
    await db.execute(update(proposal_review_log).where(proposal_review_log.c.id == proposal_id).values(final_status="Approved"))
    await db.execute(
        insert(proposals).values(
            user_id=row.user_id, customer_id=row.customer_id, lead_name=row.lead_name,
            company=row.company, proposal_status="Approved", ai_generated=True, metadata={"content": row.content},
        )
    )
    await db.commit()
    return {"message": "Proposal approved"}


@router.post("/{proposal_id}/reject")
async def reject_proposal(proposal_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(proposal_review_log).where(proposal_review_log.c.id == proposal_id, proposal_review_log.c.user_id == user["id"]))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Proposal not found")
    await db.execute(update(proposal_review_log).where(proposal_review_log.c.id == proposal_id).values(final_status="Rejected"))
    await db.commit()
    return {"message": "Proposal rejected"}

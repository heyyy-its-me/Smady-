from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy import select, insert, update
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from database import get_db
from models import proposal_results, users
from auth import get_current_user
from webhooks import trigger_webhook, is_webhook_configured, verify_callback_secret

router = APIRouter(prefix="/api/proposals", tags=["proposals"])


class GenerateProposalRequest(BaseModel):
    lead_name: str
    lead_email: str
    proposal_template: str
    key_points: Optional[str] = ""


class ProposalCallbackRequest(BaseModel):
    request_id: str
    customer_id: Optional[str] = None
    user_id: str
    lead_name: str
    lead_email: str
    proposal_json: dict
    guardrail_errors: List[str] = []
    reviewer_approved: bool = False


def serialize(row):
    return {
        "id": str(row.id),
        "user_id": str(row.user_id),
        "request_id": str(row.request_id) if row.request_id else None,
        "lead_name": row.lead_name,
        "lead_email": row.lead_email,
        "proposal_json": row.proposal_json,
        "guardrail_errors": row.guardrail_errors,
        "reviewer_approved": row.reviewer_approved,
        "final_status": row.final_status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("/pending")
async def list_pending(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(proposal_results).where(proposal_results.c.user_id == user["id"]).order_by(proposal_results.c.created_at.desc())
    )
    return [serialize(r) for r in result.fetchall()]


@router.post("/generate")
async def generate_proposal(body: GenerateProposalRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    request_id = uuid.uuid4()
    configured = is_webhook_configured("proposals")
    result = await db.execute(
        insert(proposal_results).values(
            user_id=user["id"],
            request_id=request_id,
            lead_name=body.lead_name,
            lead_email=body.lead_email,
            proposal_json={},
            final_status="Needs Review" if configured else "webhook_not_configured",
        ).returning(proposal_results)
    )
    row = result.first()
    await db.commit()
    if configured:
        await trigger_webhook("proposals", {
            "request_id": str(request_id), "user_id": user["id"],
            "lead_name": body.lead_name, "lead_email": body.lead_email,
            "proposal_template": body.proposal_template, "key_points": body.key_points,
        })
    return serialize(row)


@router.post("/callback")
async def proposal_callback(body: ProposalCallbackRequest, x_callback_secret: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)):
    verify_callback_secret(x_callback_secret)
    try:
        user_uuid = uuid.UUID(body.user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    user_check = await db.execute(select(users.c.id).where(users.c.id == user_uuid))
    if not user_check.first():
        raise HTTPException(status_code=404, detail="Unknown user_id — refusing to record proposal")

    result = await db.execute(select(proposal_results).where(proposal_results.c.request_id == body.request_id))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Proposal request not found")

    await db.execute(
        update(proposal_results).where(proposal_results.c.request_id == body.request_id).values(
            proposal_json=body.proposal_json,
            guardrail_errors=body.guardrail_errors,
            reviewer_approved=body.reviewer_approved,
            final_status="Approved" if body.reviewer_approved else "Needs Review",
        )
    )
    await db.commit()
    return {"message": "Proposal updated"}


@router.get("/{proposal_id}")
async def get_proposal(proposal_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        proposal_uuid = uuid.UUID(proposal_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Proposal not found")
    result = await db.execute(
        select(proposal_results).where(proposal_results.c.id == proposal_uuid, proposal_results.c.user_id == user["id"])
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return serialize(row)


@router.post("/{proposal_id}/approve")
async def approve_proposal(proposal_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        proposal_uuid = uuid.UUID(proposal_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Proposal not found")
    owner_check = await db.execute(
        select(proposal_results.c.user_id).where(proposal_results.c.id == proposal_uuid)
    )
    owner_row = owner_check.first()
    if not owner_row or str(owner_row.user_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Proposal not found")
    result = await db.execute(
        update(proposal_results).where(proposal_results.c.id == proposal_uuid).values(final_status="Approved").returning(proposal_results)
    )
    row = result.first()
    await db.commit()
    return serialize(row)


@router.post("/{proposal_id}/reject")
async def reject_proposal(proposal_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        proposal_uuid = uuid.UUID(proposal_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Proposal not found")
    owner_check = await db.execute(
        select(proposal_results.c.user_id).where(proposal_results.c.id == proposal_uuid)
    )
    owner_row = owner_check.first()
    if not owner_row or str(owner_row.user_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Proposal not found")
    result = await db.execute(
        update(proposal_results).where(proposal_results.c.id == proposal_uuid).values(final_status="Rejected").returning(proposal_results)
    )
    row = result.first()
    await db.commit()
    return serialize(row)

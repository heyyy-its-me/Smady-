"""
Proposals router — Phase 1 of SMADY master build.

Two data sources:
  1. public.proposal_review_log  — n8n Proposal Agent writes here when guardrail/AI review
     flags a proposal for human approval.  INTEGER serial id, meeting_id = Fireflies transcript id.
  2. public.proposal_results     — app-generated proposals (legacy flow, kept for compatibility).

Approve flow: GET  /webhook/proposal-approve?meeting_id={id}  on n8n (the same URL as the
              email button — reuses proven email send logic).
Reject  flow: POST /form/proposal-feedback  with fields {"Meeting ID": id, "Feedback": text}
              — matches the n8n form that already validates min-10-char feedback.

Ownership gap: n8n does NOT populate user_id/customer_id in proposal_review_log.
We scope by matching lead_email against the authenticated user's lead_results rows.
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel, field_validator
from typing import Optional, List, Dict, Any
from sqlalchemy import select, insert, update, text
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import os
import httpx
import logging
from datetime import datetime

from database import get_db
from models import public_proposal_review_log, proposal_results, pricing_packages, lead_results, users
from auth import get_current_user
from webhooks import trigger_webhook, is_webhook_configured, verify_callback_secret

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/proposals", tags=["proposals"])


# ── Pydantic models for webhook ──────────────────────────────────────────────

class ProposalWebhookRequest(BaseModel):
    """Payload from N8N Proposal workflow → backend webhook."""
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    customer_id: Optional[str] = None
    meeting_id: str  # Required: links to meetings table
    lead_email: str  # Required: for verification
    lead_name: Optional[str] = None
    company: Optional[str] = None
    proposal_json: Optional[Dict[str, Any]] = None
    guardrail_errors: Optional[List[str]] = None
    final_status: str = "Needs Review"  # Default status
    context_json: Optional[Dict[str, Any]] = None


# ── helpers ──────────────────────────────────────────────────────────────────

def _safe_list(val) -> list:
    """Normalise guardrail_errors / reviewer_issues regardless of storage format."""
    if val is None:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        import json
        try:
            parsed = json.loads(val)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return []


def _serialize_review_log(row) -> dict:
    """Serialise a row from public.proposal_review_log."""
    pj = row.proposal_json or {}
    return {
        "id": row.id,  # INTEGER
        "meeting_id": row.meeting_id,
        "lead_email": row.lead_email,
        "final_status": row.final_status,
        "guardrail_errors": _safe_list(row.guardrail_errors),
        "reviewer_approved": row.reviewer_approved,
        "reviewer_issues": _safe_list(row.reviewer_issues),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        # proposal fields extracted from proposal_json
        "package_selected": pj.get("package_selected") if isinstance(pj, dict) else None,
        "quoted_price": pj.get("quoted_price") if isinstance(pj, dict) else None,
        "valid_until": pj.get("valid_until") if isinstance(pj, dict) else None,
        "subject": pj.get("subject") if isinstance(pj, dict) else None,
        "body_html": pj.get("body_html") if isinstance(pj, dict) else None,
        "context_json": row.context_json,
        # revision indicator: final_status was already 'sent_after_revision' in a previous row for same meeting_id
        "is_revision": False,  # populated by list endpoint
    }


def _serialize_proposal_result(row) -> dict:
    """Serialise a row from public.proposal_results (legacy app flow)."""
    return {
        "id": str(row.id),
        "user_id": str(row.user_id),
        "request_id": str(row.request_id) if row.request_id else None,
        "lead_name": row.lead_name,
        "lead_email": row.lead_email,
        "proposal_json": row.proposal_json,
        "guardrail_errors": _safe_list(row.guardrail_errors),
        "reviewer_approved": row.reviewer_approved,
        "final_status": row.final_status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "reviewer_issues": [],
        "context_json": None,
        "meeting_id": None,
        "is_revision": False,
    }


async def _get_user_lead_emails(db: AsyncSession, user_id: str) -> set:
    """
    Return the set of lead emails belonging to this user (via public.lead_results).
    Used to soft-scope public.proposal_review_log since n8n doesn't set user_id there.
    """
    result = await db.execute(
        select(lead_results.c.leads).where(lead_results.c.user_id == user_id)
    )
    emails = set()
    for row in result.fetchall():
        for item in (row.leads or []):
            if isinstance(item, dict):
                e = item.get("Email") or item.get("email") or item.get("email_address")
                if e:
                    emails.add(str(e).lower())
    return emails


# ── GET /api/proposals/packages ───────────────────────────────────────────────

def _serialize_package(r) -> dict:
    return {
        "id": r.id,
        "user_id": str(r.user_id) if r.user_id else None,
        "package_name": r.package_name,
        "floor_price": float(r.floor_price),
        "ceiling_price": float(r.ceiling_price),
        "includes": r.includes,
        "valid_days": r.valid_days,
        "active": r.active,
        "is_own": r.user_id is not None,
    }


class PricingPackageCreate(BaseModel):
    package_name: str
    floor_price: float
    ceiling_price: float
    includes: Optional[str] = None
    valid_days: int = 30
    active: bool = True

    @field_validator("ceiling_price")
    @classmethod
    def _ceiling_gte_floor(cls, v, info):
        floor = info.data.get("floor_price")
        if floor is not None and v < floor:
            raise ValueError("ceiling_price must be >= floor_price")
        return v


class PricingPackageUpdate(BaseModel):
    package_name: Optional[str] = None
    floor_price: Optional[float] = None
    ceiling_price: Optional[float] = None
    includes: Optional[str] = None
    valid_days: Optional[int] = None
    active: Optional[bool] = None


@router.get("/packages")
async def list_packages(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Return this user's own pricing plans plus any global (user_id IS NULL) fallback plans."""
    result = await db.execute(
        select(pricing_packages)
        .where(
            pricing_packages.c.active == True,
            (pricing_packages.c.user_id == user["id"]) | (pricing_packages.c.user_id.is_(None)),
        )
        .order_by(pricing_packages.c.user_id.desc().nullslast(), pricing_packages.c.floor_price)
    )
    return [_serialize_package(r) for r in result.fetchall()]


@router.post("/packages", status_code=201)
async def create_package(body: PricingPackageCreate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Create a pricing plan owned by the current user."""
    result = await db.execute(
        insert(pricing_packages).values(
            user_id=user["id"],
            package_name=body.package_name,
            floor_price=body.floor_price,
            ceiling_price=body.ceiling_price,
            includes=body.includes,
            valid_days=body.valid_days,
            active=body.active,
            updated_at=datetime.now(),
        ).returning(pricing_packages)
    )
    row = result.first()
    await db.commit()
    return _serialize_package(row)


@router.put("/packages/{package_id}")
async def update_package(package_id: int, body: PricingPackageUpdate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Update a pricing plan. Only the owning user may edit it; global (user_id NULL) plans are read-only."""
    existing = await db.execute(select(pricing_packages).where(pricing_packages.c.id == package_id))
    row = existing.first()
    if not row:
        raise HTTPException(status_code=404, detail="Pricing plan not found")
    if row.user_id is None or str(row.user_id) != str(user["id"]):
        raise HTTPException(status_code=403, detail="You can only edit your own pricing plans")

    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        updates["updated_at"] = datetime.now()
        result = await db.execute(
            update(pricing_packages).where(pricing_packages.c.id == package_id).values(**updates).returning(pricing_packages)
        )
        row = result.first()
        await db.commit()
    return _serialize_package(row)


@router.delete("/packages/{package_id}", status_code=204)
async def delete_package(package_id: int, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Delete a pricing plan owned by the current user."""
    existing = await db.execute(select(pricing_packages).where(pricing_packages.c.id == package_id))
    row = existing.first()
    if not row:
        raise HTTPException(status_code=404, detail="Pricing plan not found")
    if row.user_id is None or str(row.user_id) != str(user["id"]):
        raise HTTPException(status_code=403, detail="You can only delete your own pricing plans")

    await db.execute(pricing_packages.delete().where(pricing_packages.c.id == package_id))
    await db.commit()
    return None


# ── POST /api/proposals/webhook ───────────────────────────────────────────────

@router.post("/webhook")
async def proposal_callback(
    body: ProposalWebhookRequest,
    x_callback_secret: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Receive proposal callback from N8N Proposal workflow.
    
    This webhook fires after N8N generates a proposal:
    1. Retrieves lead enrichment from database
    2. Runs AI guardrail validation (checks for risky commitments, etc.)
    3. If guardrails pass → marks final_status="Sent" and emails prospect
    4. If guardrails fail → marks final_status="Needs Review" for human review
    5. Calls this webhook to notify backend with result
    
    Backend then:
    - Stores proposal_json + metadata in proposal_review_log
    - Links user_id + meeting_id for proposal ownership tracking
    - Enables frontend to display "Needs Review" proposals to user
    
    Frontend user can then:
    - Click "Accept" → calls N8N approve webhook → sends email
    - Click "Reject" + feedback → calls N8N reject webhook → triggers regeneration
    
    WORKFLOW DIAGRAM:
        N8N: Meeting scheduled → 3h wait → Fetch transcript (Fireflies)
             → Extract leads → Query lead DB for enrichment
             → Claude AI: Generate proposal with lead context
             → AI Guardrail: Check for risky terms/commitments
             → If pass: Mark "Sent", send email via Gmail
             → If fail: Mark "Needs Review", skip email
             → POST /api/proposals/webhook (this endpoint)
        Backend: Store proposal_review_log, link to user via meeting.user_id
        Frontend: Poll /api/proposals, show "Needs Review" to user
        User: Click Accept/Reject → triggers N8N approval/rejection workflows
    """
    # 1. Verify webhook secret
    try:
        verify_callback_secret(x_callback_secret, os.environ.get("N8N_CALLBACK_SECRET"))
    except Exception as e:
        logger.error("Webhook secret verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid webhook secret")
    
    # 2. Validate required fields
    if not body.meeting_id:
        raise HTTPException(status_code=400, detail="meeting_id is required")
    if not body.lead_email:
        raise HTTPException(status_code=400, detail="lead_email is required")
    
    # 3. Optional: Validate meeting exists (links to user)
    if body.meeting_id and body.meeting_id != "test-ff-001":  # Allow test data
        from models import meetings
        meeting_check = await db.execute(
            select(meetings.c.user_id).where(meetings.c.id == body.meeting_id)
        )
        meeting_row = meeting_check.first()
        if not meeting_row:
            logger.warning("Proposal webhook for unknown meeting_id: %s", body.meeting_id)
            # Don't fail — N8N may use different meeting_id format; just store it
        else:
            # Use meeting's user_id if N8N didn't provide one
            if not body.user_id:
                body.user_id = str(meeting_row.user_id)
    
    # 4. Upsert into proposal_review_log
    # Strategy: Try to find existing row by meeting_id, update it; else insert new
    logger.info(
        "Proposal webhook: meeting_id=%s, lead_email=%s, user_id=%s, status=%s",
        body.meeting_id, body.lead_email, body.user_id, body.final_status
    )
    
    try:
        # Check if proposal already exists for this meeting_id
        existing = await db.execute(
            select(public_proposal_review_log).where(
                public_proposal_review_log.c.meeting_id == body.meeting_id
            )
        )
        existing_row = existing.first()
        
        if existing_row:
            # UPDATE: Keep the ID, update content and status
            stmt = update(public_proposal_review_log).where(
                public_proposal_review_log.c.meeting_id == body.meeting_id
            ).values(
                proposal_json=body.proposal_json,
                guardrail_errors=body.guardrail_errors or [],
                final_status=body.final_status,
                context_json=body.context_json,
                updated_at=datetime.utcnow(),
            ).returning(public_proposal_review_log.c.id)
            
            result = await db.execute(stmt)
            proposal_id = result.scalar()
            await db.commit()
            logger.info("Updated existing proposal_review_log id=%s", proposal_id)
        else:
            # INSERT: Create new row
            stmt = insert(public_proposal_review_log).values(
                meeting_id=body.meeting_id,
                user_id=body.user_id,
                customer_id=body.customer_id,
                lead_email=body.lead_email,
                lead_name=body.lead_name,
                company=body.company,
                proposal_json=body.proposal_json,
                guardrail_errors=body.guardrail_errors or [],
                final_status=body.final_status,
                context_json=body.context_json,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            ).returning(public_proposal_review_log.c.id)
            
            result = await db.execute(stmt)
            proposal_id = result.scalar()
            await db.commit()
            logger.info("Created new proposal_review_log id=%s", proposal_id)
        
        return {
            "message": "Proposal stored successfully",
            "proposal_id": proposal_id,
            "user_id": body.user_id,
            "meeting_id": body.meeting_id,
            "final_status": body.final_status,
            "stored_at": datetime.utcnow().isoformat(),
        }
    
    except Exception as e:
        logger.error("Failed to store proposal: %s", e, exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to store proposal: {str(e)}")


# ── GET /api/proposals ────────────────────────────────────────────────────────

@router.get("")
async def list_proposals(
    status: Optional[str] = Query(None, description="Filter by final_status"),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns proposals from public.proposal_review_log (n8n-generated) PLUS
    public.proposal_results (app-generated), most recent first.

    Scoping: proposal_review_log rows are filtered to leads whose email appears
    in this user's lead_results; proposal_results rows are filtered by user_id.
    Falls back to showing all proposal_review_log rows if the user has no leads
    (e.g., first time user, or admin view).
    """
    uid = user["id"]

    # --- n8n review log -------------------------------------------------------
    user_emails = await _get_user_lead_emails(db, uid)

    q = select(public_proposal_review_log).order_by(public_proposal_review_log.c.id.desc())
    if status:
        q = q.where(public_proposal_review_log.c.final_status == status)
    result = await db.execute(q)
    n8n_rows = result.fetchall()

    # Detect which meeting_ids already have a 'sent_after_revision' entry
    revision_meeting_ids = {r.meeting_id for r in n8n_rows if r.final_status == "sent_after_revision"}

    review_rows = []
    for r in n8n_rows:
        row_email = (r.lead_email or "").lower()
        # Show row if user has no leads yet OR lead email matches
        if not user_emails or row_email in user_emails:
            d = _serialize_review_log(r)
            # Mark second-cycle reviews
            if r.meeting_id and r.meeting_id in revision_meeting_ids and r.final_status in ("needs_review", "Needs Review"):
                d["is_revision"] = True
            review_rows.append(d)

    # --- app proposal_results -------------------------------------------------
    q2 = select(proposal_results).where(proposal_results.c.user_id == uid).order_by(proposal_results.c.created_at.desc())
    if status:
        q2 = q2.where(proposal_results.c.final_status == status)
    result2 = await db.execute(q2)
    app_rows = [_serialize_proposal_result(r) for r in result2.fetchall()]

    return {"review_queue": review_rows, "app_proposals": app_rows}


# ── GET /api/proposals/pending (backward compat) ──────────────────────────────

@router.get("/pending")
async def list_pending(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Backward-compatible: return app-generated proposals for this user."""
    result = await db.execute(
        select(proposal_results).where(proposal_results.c.user_id == user["id"]).order_by(proposal_results.c.created_at.desc())
    )
    return [_serialize_proposal_result(r) for r in result.fetchall()]


# ── GET /api/proposals/{meeting_id} ───────────────────────────────────────────

@router.get("/{proposal_ref}")
async def get_proposal(
    proposal_ref: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch full proposal detail.
    - If proposal_ref is an integer string → look up public.proposal_review_log by id.
    - If proposal_ref looks like a UUID → look up public.proposal_results by id.
    - Otherwise treat as meeting_id and search proposal_review_log.
    """
    # Try integer id first (n8n review log)
    try:
        row_id = int(proposal_ref)
        result = await db.execute(
            select(public_proposal_review_log).where(public_proposal_review_log.c.id == row_id)
        )
        row = result.first()
        if row:
            return _serialize_review_log(row)
    except ValueError:
        pass

    # Try UUID (app proposal_results)
    try:
        proposal_uuid = uuid.UUID(proposal_ref)
        result = await db.execute(
            select(proposal_results).where(
                proposal_results.c.id == proposal_uuid,
                proposal_results.c.user_id == user["id"]
            )
        )
        row = result.first()
        if row:
            return _serialize_proposal_result(row)
    except ValueError:
        pass

    # Treat as meeting_id
    result = await db.execute(
        select(public_proposal_review_log)
        .where(public_proposal_review_log.c.meeting_id == proposal_ref)
        .order_by(public_proposal_review_log.c.id.desc())
        .limit(1)
    )
    row = result.first()
    if row:
        return _serialize_review_log(row)

    raise HTTPException(status_code=404, detail="Proposal not found")


# ── POST /api/proposals/{meeting_id}/approve ──────────────────────────────────

@router.post("/{proposal_ref}/approve")
async def approve_proposal(
    proposal_ref: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Approve a proposal. For n8n-managed proposals, calls the n8n approve webhook
    (same GET URL as the email button — reuses n8n's proven send logic).
    For app proposals, updates final_status locally.

    LIVE-FIRE WARNING: if n8n approve URL is configured, calling this WILL send
    a real email to the lead. Only call after explicit user confirmation.
    """
    approve_url = os.environ.get("N8N_PROPOSALS_APPROVE_URL", "").strip()

    # --- n8n review log (integer id or meeting_id) ---
    meeting_id = None
    try:
        row_id = int(proposal_ref)
        result = await db.execute(
            select(public_proposal_review_log).where(public_proposal_review_log.c.id == row_id)
        )
        row = result.first()
        if row:
            meeting_id = row.meeting_id
    except ValueError:
        pass

    if meeting_id is None:
        # Try as UUID for app proposals
        try:
            proposal_uuid = uuid.UUID(proposal_ref)
            owner_check = await db.execute(
                select(proposal_results.c.user_id).where(proposal_results.c.id == proposal_uuid)
            )
            owner_row = owner_check.first()
            if not owner_row or str(owner_row.user_id) != user["id"]:
                raise HTTPException(status_code=404, detail="Proposal not found")
            res = await db.execute(
                update(proposal_results).where(proposal_results.c.id == proposal_uuid)
                .values(final_status="Approved").returning(proposal_results)
            )
            row = res.first()
            await db.commit()
            return _serialize_proposal_result(row)
        except ValueError:
            pass
        # Try as meeting_id string
        meeting_id = proposal_ref

    # Call n8n approve webhook
    if approve_url:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(f"{approve_url}?meeting_id={meeting_id}")
            logger.info("n8n approve webhook responded: %s", resp.status_code)
            if resp.status_code == 200:
                # n8n accepted — email will be sent by n8n
                return {"message": "Proposal approved and sent via n8n", "meeting_id": meeting_id, "n8n_status": 200}
            elif resp.status_code == 404:
                # n8n workflow is INACTIVE — mark locally, tell user to activate
                result = await db.execute(
                    update(public_proposal_review_log)
                    .where(public_proposal_review_log.c.meeting_id == meeting_id)
                    .values(final_status="Approved")
                )
                await db.commit()
                return {
                    "message": "Marked approved locally. n8n approve workflow is inactive — activate the 'Proposal Agent' workflow in n8n to auto-send the email.",
                    "meeting_id": meeting_id,
                    "n8n_status": 404,
                    "local_status": "Approved",
                }
            else:
                logger.error("n8n approve webhook returned %s: %s", resp.status_code, resp.text[:200])
                raise HTTPException(status_code=502, detail=f"n8n approve webhook returned {resp.status_code}")
        except HTTPException:
            raise
        except Exception as e:
            logger.error("n8n approve webhook failed: %s", e)
            raise HTTPException(status_code=502, detail=f"Failed to reach n8n approve webhook: {e}")
    else:
        # No webhook — update local DB status as a dry-run
        result = await db.execute(
            update(public_proposal_review_log)
            .where(public_proposal_review_log.c.meeting_id == meeting_id)
            .values(final_status="Approved")
        )
        await db.commit()
        return {"message": "Proposal marked Approved (n8n URL not configured — email NOT sent)", "meeting_id": meeting_id}


# ── POST /api/proposals/{meeting_id}/reject ───────────────────────────────────

class RejectRequest(BaseModel):
    feedback: str

    @field_validator("feedback")
    @classmethod
    def feedback_min_length(cls, v: str) -> str:
        if len(v.strip()) < 10:
            raise ValueError("Feedback must be at least 10 characters")
        return v.strip()


@router.post("/{proposal_ref}/reject")
async def reject_proposal(
    proposal_ref: str,
    body: RejectRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reject and queue for regeneration.
    - Validates feedback >= 10 chars.
    - For n8n proposals: POSTs feedback to the n8n rejection webhook which triggers regeneration.
    - For app proposals: marks as Rejected locally.

    LIVE-FIRE WARNING: if the n8n webhook URL is configured, this WILL trigger n8n to
    regenerate and (if it passes) email a revised proposal. Only call after confirmation.
    """
    reject_url = os.environ.get("N8N_PROPOSALS_REJECT_WEBHOOK_URL", "").strip()

    meeting_id = None
    try:
        row_id = int(proposal_ref)
        result = await db.execute(
            select(public_proposal_review_log).where(public_proposal_review_log.c.id == row_id)
        )
        row = result.first()
        if row:
            meeting_id = row.meeting_id
    except ValueError:
        pass

    if meeting_id is None:
        try:
            proposal_uuid = uuid.UUID(proposal_ref)
            owner_check = await db.execute(
                select(proposal_results.c.user_id).where(proposal_results.c.id == proposal_uuid)
            )
            owner_row = owner_check.first()
            if not owner_row or str(owner_row.user_id) != user["id"]:
                raise HTTPException(status_code=404, detail="Proposal not found")
            res = await db.execute(
                update(proposal_results).where(proposal_results.c.id == proposal_uuid)
                .values(final_status="Rejected").returning(proposal_results)
            )
            row = res.first()
            await db.commit()
            return _serialize_proposal_result(row)
        except ValueError:
            pass
        meeting_id = proposal_ref

    if reject_url:
        # n8n form trigger expects form-encoded POST with the exact field names
        # the form defines: "Meeting ID" and "Feedback"
        form_data = {"Meeting ID": meeting_id, "Feedback": body.feedback}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(reject_url, data=form_data)
            logger.info("n8n reject form responded: %s %s", resp.status_code, resp.text[:200])
            if resp.status_code == 200:
                return {
                    "message": "Feedback submitted — n8n will regenerate the proposal",
                    "meeting_id": meeting_id,
                    "n8n_status": resp.status_code,
                }
            else:
                # n8n form workflow inactive or error — mark locally as Rejected
                await db.execute(
                    update(public_proposal_review_log)
                    .where(public_proposal_review_log.c.meeting_id == meeting_id)
                    .values(final_status="Rejected")
                )
                await db.commit()
                return {
                    "message": "Marked rejected locally. n8n feedback form returned an error — activate the 'Proposal Agent' workflow in n8n to enable automatic regeneration.",
                    "meeting_id": meeting_id,
                    "n8n_status": resp.status_code,
                    "local_status": "Rejected",
                }
        except Exception as e:
            logger.error("n8n reject form failed: %s", e)
            raise HTTPException(status_code=502, detail=f"Failed to reach n8n reject form: {e}")
    else:
        result = await db.execute(
            update(public_proposal_review_log)
            .where(public_proposal_review_log.c.meeting_id == meeting_id)
            .values(final_status="Rejected")
        )
        await db.commit()
        return {"message": "Proposal marked Rejected (n8n URL not configured — no regeneration)", "meeting_id": meeting_id}


# ── POST /api/proposals/generate (existing app flow) ─────────────────────────

class GenerateProposalRequest(BaseModel):
    lead_name: str
    lead_email: str
    proposal_template: str
    proposal_subject: str
    proposal_body: str
    quoted_price: float
    valid_days: int = 30
    key_points: Optional[str] = ""


@router.post("/generate")
async def generate_proposal(body: GenerateProposalRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    request_id = uuid.uuid4()
    configured = is_webhook_configured("proposals")
    # Note: this row is just an app-side receipt of the request. The real reviewable
    # proposal is written directly into public.proposal_review_log by n8n's Postgres node
    # (n8n does NOT call back into this backend). Status "submitted" keeps this receipt
    # out of the "Needs Review" queue/count so it doesn't show as a false pending item.
    result = await db.execute(
        insert(proposal_results).values(
            user_id=user["id"],
            request_id=request_id,
            lead_name=body.lead_name,
            lead_email=body.lead_email,
            proposal_json={},
            final_status="submitted" if configured else "webhook_not_configured",
        ).returning(proposal_results)
    )
    row = result.first()
    await db.commit()
    if configured:
        await trigger_webhook("proposals", {
            "request_id": str(request_id), "user_id": user["id"], "user_email": user["email"],
            "lead_name": body.lead_name, "lead_email": body.lead_email,
            "proposal_template": body.proposal_template, "key_points": body.key_points,
            "proposal_subject": body.proposal_subject, "proposal_body": body.proposal_body,
            "quoted_price": body.quoted_price, "valid_days": body.valid_days,
        })
    return _serialize_proposal_result(row)


# ── POST /api/proposals/callback ──────────────────────────────────────────────

class ProposalCallbackRequest(BaseModel):
    request_id: str
    customer_id: Optional[str] = None
    user_id: str
    lead_name: str
    lead_email: str
    proposal_json: dict
    guardrail_errors: List[str] = []
    reviewer_approved: bool = False


@router.post("/callback")
async def proposal_callback(body: ProposalCallbackRequest, x_callback_secret: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)):
    verify_callback_secret(x_callback_secret)
    try:
        user_uuid = uuid.UUID(body.user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    user_check = await db.execute(select(users.c.id).where(users.c.id == user_uuid))
    if not user_check.first():
        raise HTTPException(status_code=404, detail="Unknown user_id")

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

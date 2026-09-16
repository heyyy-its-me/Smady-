from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
import uuid

from database import get_db
from models import company_profiles, lead_results, meetings, proposal_results
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["history"])


def _ms_to_iso(ms):
    if ms is None:
        return None
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).isoformat()


@router.get("/history")
async def get_real_history(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Unified history across the real data sources: company_profiles (ICP),
    lead_results (Leads), meetings, proposal_results — each filtered to the
    session user (customer_id for company_profiles, user_id everywhere else)."""
    uid = user["id"]
    rows = []

    # ICP — company_profiles has no per-user column, only customer_id.
    # We only know this user's own customer via the session, so this is
    # scoped at the account (customer) level, not the individual login.
    if user.get("customer_id"):
        cp_r = await db.execute(
            select(company_profiles).where(company_profiles.c.customer_id == user["customer_id"]).order_by(company_profiles.c.created_at.desc()).limit(20)
        )
        for r in cp_r.fetchall():
            rows.append({
                "id": str(r.id), "type": "icp", "label": f"ICP · {r.company_name or r.product_name or 'Company Profile'}",
                "status": "Completed", "created_at": r.created_at.isoformat() if r.created_at else None,
            })

    lr_r = await db.execute(select(lead_results).where(lead_results.c.user_id == uid).order_by(lead_results.c.created_at.desc()).limit(20))
    for r in lr_r.fetchall():
        rows.append({
            "id": r.request_id, "type": "leads", "label": f"Lead Run · {r.total_count or 0} leads",
            "status": r.status, "created_at": _ms_to_iso(r.created_at),
        })

    m_r = await db.execute(select(meetings).where(meetings.c.user_id == uid).order_by(meetings.c.created_at.desc()).limit(20))
    for r in m_r.fetchall():
        rows.append({
            "id": str(r.id), "type": "meeting", "label": f"Meeting · {r.lead_name or 'Unnamed lead'}",
            "status": r.status, "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    p_r = await db.execute(select(proposal_results).where(proposal_results.c.user_id == uid).order_by(proposal_results.c.created_at.desc()).limit(20))
    for r in p_r.fetchall():
        rows.append({
            "id": str(r.id), "type": "proposal", "label": f"Proposal · {r.lead_name or 'Unnamed lead'}",
            "status": r.final_status, "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    rows.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return rows


@router.get("/company-profiles/{profile_id}")
async def get_company_profile(profile_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        profile_uuid = uuid.UUID(profile_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Company profile not found")
    if not user.get("customer_id"):
        raise HTTPException(status_code=404, detail="Company profile not found")
    result = await db.execute(
        select(company_profiles).where(company_profiles.c.id == profile_uuid, company_profiles.c.customer_id == user["customer_id"])
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return {
        "id": str(row.id), "company_name": row.company_name, "product_name": row.product_name,
        "positioning": row.positioning, "differentiator": row.differentiator, "core_problem": row.core_problem,
        "buyer_pain": row.buyer_pain, "target_segment": row.target_segment,
        "confidence_score": float(row.confidence_score) if row.confidence_score is not None else None,
        "icp_data": row.icp_data, "gtm_strategy": row.gtm_strategy, "buyer_persona": row.buyer_persona,
    }


@router.get("/lead-results/{request_id}")
async def get_lead_result(request_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(lead_results).where(lead_results.c.request_id == request_id, lead_results.c.user_id == user["id"])
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Lead result not found")
    return {
        "request_id": row.request_id, "status": row.status, "total_count": row.total_count,
        "leads": row.leads, "error": row.error, "created_at": _ms_to_iso(row.created_at),
    }

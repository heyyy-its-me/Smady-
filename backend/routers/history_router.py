from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import company_profiles, lead_runs, outreach_campaigns, meetings, proposal_review_log
from auth import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("")
async def get_history(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    uid = user["id"]
    items = []

    icp_r = await db.execute(select(company_profiles).where(company_profiles.c.user_id == uid))
    for r in icp_r.fetchall():
        items.append({
            "request_id": str(r.request_id), "type": "icp", "status": r.status,
            "title": "ICP profile generated", "created_at": r.created_at.isoformat(),
        })

    leads_r = await db.execute(select(lead_runs).where(lead_runs.c.user_id == uid))
    for r in leads_r.fetchall():
        items.append({
            "request_id": str(r.request_id), "type": "leads", "status": r.status,
            "title": "Lead sourcing run", "created_at": r.created_at.isoformat(),
        })

    outreach_r = await db.execute(select(outreach_campaigns).where(outreach_campaigns.c.user_id == uid))
    for r in outreach_r.fetchall():
        items.append({
            "request_id": str(r.request_id), "type": "outreach", "status": r.status,
            "title": f"Campaign: {r.name}", "created_at": r.created_at.isoformat(),
        })

    meetings_r = await db.execute(select(meetings).where(meetings.c.user_id == uid))
    for r in meetings_r.fetchall():
        items.append({
            "request_id": str(r.id), "type": "meeting", "status": r.outcome,
            "title": f"Meeting with {r.lead_name or 'a lead'}", "created_at": r.created_at.isoformat(),
        })

    proposals_r = await db.execute(select(proposal_review_log).where(proposal_review_log.c.user_id == uid))
    for r in proposals_r.fetchall():
        items.append({
            "request_id": str(r.id), "type": "proposal", "status": r.final_status,
            "title": f"Proposal for {r.lead_name or 'a lead'}", "created_at": r.created_at.isoformat(),
        })

    items.sort(key=lambda x: x["created_at"], reverse=True)
    return items

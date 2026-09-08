import os
import time
import logging
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from sqlalchemy import select, insert, update
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
import uuid

from database import get_db
from models import lead_results, run_status, lead_runs
from auth import get_current_user
from webhooks import trigger_webhook, is_webhook_configured, verify_callback_secret

router = APIRouter(prefix="/api/leads", tags=["leads"])
logger = logging.getLogger(__name__)


class LeadsGenerateRequest(BaseModel):
    industries: List[str] = []
    roles: List[str] = []
    countries: List[str] = []
    cities: List[str] = []
    companySize: Optional[str] = None


class LeadsCallbackRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    request_id: str
    status: Optional[str] = "success"
    leads: Optional[List[Dict[str, Any]]] = None
    total_count: Optional[int] = None
    error: Optional[str] = None


class SendToOutreachRequest(BaseModel):
    ids: List[str]


class UploadLeadsRequest(BaseModel):
    count: int = 5


def _naive_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _ms_to_iso(ms):
    if ms is None:
        return None
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).isoformat()


def _normalize_lead(raw: Dict[str, Any], request_id: str, index: int) -> Dict[str, Any]:
    """Defensively maps whatever key names the n8n workflow sends to the Lead shape the frozen UI expects,
    plus the extra AI-enrichment fields (score, priority, personalization hook, etc.) for the detail view."""
    def pick(*keys, default=""):
        for k in keys:
            if raw.get(k) not in (None, ""):
                return raw.get(k)
        return default

    return {
        "id": f"{request_id}-{index}",
        "name": pick("name", "full_name", "lead_name", "Contact Name"),
        "title": pick("title", "job_title", "position", "Designation"),
        "company": pick("Company Name", "company", "organization", "company_name"),
        "domain": pick("domain", "website", "company_domain", "Website"),
        "email": pick("email", "email_address", "Email"),
        "linkedin": pick("linkedin", "linkedin_url", "linkedin_profile", "LinkedIn"),
        "status": pick("status", "Qualification Status", default="New"),
        "source": pick("source", default="Agent"),
        "about": pick("about", "summary", "description", "AI Insight", "Company Description"),
        "assigned": raw.get("assigned") or [],
        "sequenceProgress": raw.get("sequenceProgress", raw.get("sequence_progress", 0)),
        "leadRunId": request_id,
        # Extra AI-enrichment fields surfaced in the lead detail view, when present.
        "leadScore": raw.get("Lead Score"),
        "priority": pick("Priority"),
        "icpMatch": pick("ICP Match"),
        "icpTier": pick("icp_tier"),
        "seniority": pick("seniority"),
        "employees": pick("Employees", "Company Size"),
        "foundedYear": pick("Founded Year"),
        "fundingStage": pick("Funding Stage"),
        "annualRevenue": pick("Annual Revenue"),
        "technologies": pick("Technologies"),
        "specialties": pick("Specialties"),
        "location": pick("Location"),
        "phone": pick("Phone"),
        "industry": pick("Industry"),
        "companyDescription": pick("Company Description"),
        "personalizationHook": pick("personalization_hook", "AI Insight"),
        "painPointsMatched": pick("pain_points_matched"),
        "recommendedAction": pick("recommended_action"),
    }


@router.get("")
async def list_leads(
    run_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns one page of leads. Defaults to the user's most recent run when run_id is omitted -
    a single run can have hundreds of leads, so this is always paginated, never a full dump."""
    target_run_id = run_id
    if not target_run_id:
        latest = await db.execute(
            select(lead_results.c.request_id)
            .where(lead_results.c.user_id == str(user["id"]), lead_results.c.status.in_(["success", "completed"]))
            .order_by(lead_results.c.created_at.desc()).limit(1)
        )
        latest_row = latest.first()
        target_run_id = latest_row.request_id if latest_row else None

    if not target_run_id:
        return {"leads": [], "total": 0, "run_id": None, "status": None}

    result = await db.execute(select(lead_results).where(lead_results.c.request_id == target_run_id, lead_results.c.user_id == str(user["id"])))
    row = result.first()
    if not row:
        return {"leads": [], "total": 0, "run_id": target_run_id, "status": None}

    all_leads = row.leads or []
    page = all_leads[offset: offset + limit]
    leads_out = [_normalize_lead(item, row.request_id, offset + i) for i, item in enumerate(page)]
    all_normalized = [_normalize_lead(item, row.request_id, i) for i, item in enumerate(all_leads)]
    verified_count = sum(1 for l in all_normalized if l["status"] != "New")
    ready_count = sum(1 for l in all_normalized if l["status"] in ("New", "Verified"))
    return {
        "leads": leads_out, "total": len(all_leads), "run_id": row.request_id, "status": row.status,
        "verified_count": verified_count, "ready_count": ready_count,
    }


@router.get("/runs")
async def list_runs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Run history for the picker - one entry per 'Generate Leads' execution, newest first."""
    result = await db.execute(
        select(lead_runs).where(lead_runs.c.user_id == user["id"]).order_by(lead_runs.c.created_at.desc()).offset(offset).limit(limit)
    )
    runs = result.fetchall()
    if not runs:
        return []
    request_ids = [str(r.request_id) for r in runs]
    counts_result = await db.execute(select(lead_results).where(lead_results.c.request_id.in_(request_ids)))
    counts = {r.request_id: (r.total_count or 0, r.status) for r in counts_result.fetchall()}
    out = []
    for r in runs:
        total_count, live_status = counts.get(str(r.request_id), (0, r.status))
        out.append({
            "request_id": str(r.request_id),
            "status": live_status or r.status,
            "total_count": total_count,
            "filters": r.filters or {},
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return out


@router.post("/generate")
async def generate_leads(body: LeadsGenerateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    request_id = uuid.uuid4()
    configured = is_webhook_configured("leads")
    now_ms = int(time.time() * 1000)
    status = "pending" if configured else "webhook_not_configured"

    await db.execute(
        insert(lead_results).values(
            request_id=str(request_id),
            customer_id=str(user["customer_id"]) if user.get("customer_id") else None,
            user_id=str(user["id"]),
            leads=None,
            total_count=0,
            status=status,
            error=None,
            created_at=now_ms,
            completed_at=None,
            updated_at=_naive_now(),
        )
    )
    await db.execute(
        insert(run_status).values(
            request_id=request_id,
            stage="leads",
            status=status,
            updated_at=_naive_now(),
        )
    )
    await db.execute(
        insert(lead_runs).values(
            user_id=user["id"],
            customer_id=user["customer_id"],
            request_id=request_id,
            status=status,
            filters=body.model_dump(),
        )
    )
    await db.commit()

    if configured:
        public_url = os.environ.get("PUBLIC_BACKEND_URL", "").strip()
        await trigger_webhook("leads", {
            "request_id": str(request_id),
            "user_id": str(user["id"]),
            "customer_id": str(user["customer_id"]) if user.get("customer_id") else None,
            "callback_url": f"{public_url}/api/leads/callback" if public_url else None,
            **body.model_dump(),
        })
    return {"request_id": str(request_id), "status": status}


@router.get("/status/{request_id}")
async def get_leads_status(request_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(lead_results).where(lead_results.c.request_id == request_id, lead_results.c.user_id == str(user["id"])))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Lead run not found")
    return {
        "request_id": row.request_id,
        "run_id": row.request_id,
        "status": row.status,
        "total_count": row.total_count,
        "error": row.error,
        "created_at": _ms_to_iso(row.created_at),
    }


@router.post("/callback")
async def leads_callback(body: LeadsCallbackRequest, x_callback_secret: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)):
    verify_callback_secret(x_callback_secret)
    logger.info(f"Leads callback received for request_id={body.request_id}: status={body.status}, leads_count={len(body.leads or [])}")

    result = await db.execute(select(lead_results).where(lead_results.c.request_id == body.request_id))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Lead run not found")

    # n8n's HTTP node wraps the actual lead array inside each item's own "leads" key
    # (e.g. leads=[{"leads": [...], "status": "...", "total_count": N}]) - unwrap defensively.
    flat_leads: List[Dict[str, Any]] = []
    for item in body.leads or []:
        if isinstance(item, dict) and isinstance(item.get("leads"), list):
            flat_leads.extend(item["leads"])
        else:
            flat_leads.append(item)

    await db.execute(
        update(lead_results).where(lead_results.c.request_id == body.request_id).values(
            status=body.status,
            leads=flat_leads,
            total_count=body.total_count if body.total_count is not None else len(flat_leads),
            error=body.error,
            completed_at=int(time.time() * 1000),
            updated_at=_naive_now(),
        )
    )
    try:
        run_uuid = uuid.UUID(body.request_id)
        await db.execute(
            update(run_status).where(run_status.c.request_id == run_uuid).values(
                status=body.status, updated_at=_naive_now()
            )
        )
    except ValueError:
        pass
    await db.commit()
    return {"message": f"{len(flat_leads)} leads recorded"}


@router.post("/upload")
async def upload_leads(body: UploadLeadsRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    count = max(1, min(body.count, 50))
    request_id = uuid.uuid4()
    now_ms = int(time.time() * 1000)
    demo_leads = [
        {
            "name": f"Uploaded Contact {i + 1}",
            "title": "Unknown",
            "company": "Unknown Company",
            "domain": "",
            "email": "",
            "linkedin": "",
            "status": "New",
            "source": "Uploaded",
            "about": "Imported from CSV upload.",
        }
        for i in range(count)
    ]
    await db.execute(
        insert(lead_results).values(
            request_id=str(request_id),
            customer_id=str(user["customer_id"]) if user.get("customer_id") else None,
            user_id=str(user["id"]),
            leads=demo_leads,
            total_count=count,
            status="success",
            error=None,
            created_at=now_ms,
            completed_at=now_ms,
            updated_at=_naive_now(),
        )
    )
    await db.commit()
    return [_normalize_lead(item, str(request_id), i) for i, item in enumerate(demo_leads)]


@router.post("/send-to-outreach")
async def send_to_outreach(body: SendToOutreachRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    updated = 0
    by_request: Dict[str, List[int]] = {}
    for composite_id in body.ids:
        if "-" not in composite_id:
            continue
        request_id, _, idx = composite_id.rpartition("-")
        try:
            by_request.setdefault(request_id, []).append(int(idx))
        except ValueError:
            continue

    for request_id, indexes in by_request.items():
        result = await db.execute(select(lead_results).where(lead_results.c.request_id == request_id, lead_results.c.user_id == str(user["id"])))
        row = result.first()
        if not row or not row.leads:
            continue
        leads_list = list(row.leads)
        for idx in indexes:
            if 0 <= idx < len(leads_list):
                leads_list[idx]["status"] = "Contacted"
                updated += 1
        await db.execute(update(lead_results).where(lead_results.c.request_id == request_id).values(leads=leads_list))

    await db.commit()
    if updated == 0:
        raise HTTPException(status_code=404, detail="No matching leads found")
    return {"message": f"{updated} lead(s) sent to outreach"}


@router.post("/runs/{request_id}/send-to-outreach")
async def send_run_to_outreach(request_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Bulk-tags every lead in one execution as Contacted, regardless of how many pages it spans."""
    result = await db.execute(select(lead_results).where(lead_results.c.request_id == request_id, lead_results.c.user_id == str(user["id"])))
    row = result.first()
    if not row or not row.leads:
        raise HTTPException(status_code=404, detail="Lead run not found")
    leads_list = list(row.leads)
    for item in leads_list:
        item["status"] = "Contacted"
    await db.execute(update(lead_results).where(lead_results.c.request_id == request_id).values(leads=leads_list))
    await db.commit()
    return {"message": f"{len(leads_list)} lead(s) from this run sent to outreach"}

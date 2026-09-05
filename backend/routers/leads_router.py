from fastapi import APIRouter, Depends, HTTPException, Header, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy import select, insert, update
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from database import get_db
from models import lead_runs, leads
from auth import get_current_user
from webhooks import trigger_webhook, is_webhook_configured, verify_callback_secret

router = APIRouter(prefix="/api/leads", tags=["leads"])


class LeadsGenerateRequest(BaseModel):
    industries: List[str] = []
    roles: List[str] = []
    countries: List[str] = []
    cities: List[str] = []
    companySize: Optional[str] = None


class LeadItem(BaseModel):
    name: str
    title: str
    company: str
    domain: str
    email: str
    linkedin: str
    status: str = "New"
    source: str = "Agent"
    about: str = ""
    assigned: List[str] = []
    sequenceProgress: int = 0


class LeadsCallbackRequest(BaseModel):
    request_id: str
    status: str
    leads: List[LeadItem] = []


class SendToOutreachRequest(BaseModel):
    ids: List[str]


class UploadLeadsRequest(BaseModel):
    count: int = 5


def serialize_lead(row) -> Dict[str, Any]:
    return {
        "id": str(row.id),
        "name": row.name,
        "title": row.title,
        "company": row.company,
        "domain": row.domain,
        "email": row.email,
        "linkedin": row.linkedin,
        "status": row.status,
        "source": row.source,
        "about": row.about,
        "assigned": row.assigned or [],
        "sequenceProgress": row.sequence_progress,
        "leadRunId": str(row.lead_run_id) if row.lead_run_id else None,
    }


@router.get("")
async def list_leads(
    run_id: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(leads).where(leads.c.user_id == user["id"])
    if run_id:
        try:
            run_uuid = uuid.UUID(run_id)
            query = query.where(leads.c.lead_run_id == run_uuid)
        except ValueError:
            pass
    result = await db.execute(query.order_by(leads.c.created_at.desc()))
    return [serialize_lead(r) for r in result.fetchall()]


@router.post("/generate")
async def generate_leads(body: LeadsGenerateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    request_id = uuid.uuid4()
    configured = is_webhook_configured("leads")
    await db.execute(
        insert(lead_runs).values(
            user_id=user["id"],
            request_id=request_id,
            status="pending" if configured else "webhook_not_configured",
            filters=body.model_dump(),
        )
    )
    await db.commit()
    if configured:
        await trigger_webhook("leads", {"request_id": str(request_id), "user_id": user["id"], **body.model_dump()})
    return {"request_id": str(request_id), "status": "pending" if configured else "webhook_not_configured"}


@router.get("/status/{request_id}")
async def get_leads_status(request_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(lead_runs).where(lead_runs.c.request_id == request_id, lead_runs.c.user_id == user["id"]))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Lead run not found")
    return {"request_id": str(row.request_id), "run_id": str(row.id), "status": row.status, "created_at": row.created_at.isoformat()}


@router.post("/callback")
async def leads_callback(body: LeadsCallbackRequest, x_callback_secret: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)):
    verify_callback_secret(x_callback_secret)
    result = await db.execute(select(lead_runs).where(lead_runs.c.request_id == body.request_id))
    run_row = result.first()
    if not run_row:
        raise HTTPException(status_code=404, detail="Lead run not found")

    for item in body.leads:
        await db.execute(
            insert(leads).values(
                user_id=run_row.user_id,
                lead_run_id=run_row.id,
                name=item.name, title=item.title, company=item.company, domain=item.domain,
                email=item.email, linkedin=item.linkedin, status=item.status, source=item.source,
                about=item.about, assigned=item.assigned, sequence_progress=item.sequenceProgress,
            )
        )
    await db.execute(update(lead_runs).where(lead_runs.c.request_id == body.request_id).values(status=body.status))
    await db.commit()
    return {"message": f"{len(body.leads)} leads inserted"}


@router.post("/upload")
async def upload_leads(body: UploadLeadsRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    count = max(1, min(body.count, 50))
    inserted = []
    for i in range(count):
        result = await db.execute(
            insert(leads).values(
                user_id=user["id"],
                name=f"Uploaded Contact {i + 1}",
                title="Unknown", company="Unknown Company", domain="", email="",
                linkedin="", status="New", source="Uploaded", about="Imported from CSV upload.",
                assigned=[], sequence_progress=0,
            ).returning(leads)
        )
        inserted.append(serialize_lead(result.first()))
    await db.commit()
    return inserted


@router.post("/send-to-outreach")
async def send_to_outreach(body: SendToOutreachRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    valid_ids = []
    for raw_id in body.ids:
        try:
            valid_ids.append(uuid.UUID(raw_id))
        except ValueError:
            continue
    if not valid_ids:
        raise HTTPException(status_code=400, detail="No valid lead ids provided")
    result = await db.execute(
        update(leads).where(leads.c.id.in_(valid_ids), leads.c.user_id == user["id"]).values(status="Contacted")
    )
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="No matching leads found")
    return {"message": f"{result.rowcount} lead(s) sent to outreach"}

import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from sqlalchemy import select, insert, update
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
import uuid

from database import get_db
from models import icp_profiles, company_profiles
from auth import get_current_user

router = APIRouter(prefix="/api/icp", tags=["icp"])
logger = logging.getLogger(__name__)


class ICPGenerateRequest(BaseModel):
    productName: str
    productDescription: str
    companyName: str
    companyDetails: str
    countries: List[str] = []
    industries: List[str] = []
    businessStage: str
    priority: str


def serialize(row):
    return {
        "request_id": str(row.request_id),
        "status": row.status,
        "input": row.input,
        "result": row.result,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _map_icp_result(analysis: dict) -> dict:
    """Maps the real ICP Engine API response to the ICPResult shape the frozen UI expects,
    plus the extra fields for the 'View Full Analysis' detail modal."""
    a = analysis.get("analysis") or {}
    persona = analysis.get("buyer_persona") or {}
    gtm = analysis.get("gtm_strategy") or {}
    secondary = analysis.get("secondary_icps") or []
    return {
        "industry": a.get("industries") or [],
        "targetRoles": persona.get("role") or [],
        "companySize": [],  # ICP Engine API has no company-size field (confirmed) - Leads page has its own filter
        "geography": gtm.get("target_countries") or [],
        "painPoints": persona.get("pain_points") or [],
        "positioning": a.get("positioning"),
        "differentiator": a.get("differentiator"),
        "coreProblem": a.get("core_problem"),
        "buyerPain": a.get("buyer_pain"),
        "confidenceScore": analysis.get("confidence_score"),
        "gtmChannels": gtm.get("recommended_channels") or [],
        "gtmRegions": gtm.get("target_regions") or [],
        "secondaryIcps": [{"icp": s.get("icp"), "score": s.get("score")} for s in secondary],
    }


async def _upsert_company_profile(db: AsyncSession, user: dict, body: ICPGenerateRequest, analysis: dict):
    customer_id = user.get("customer_id")
    if not customer_id:
        return
    a = analysis.get("analysis") or {}
    primary_icp = analysis.get("primary_icp") or {}
    values = dict(
        company_name=body.companyName,
        product_name=body.productName,
        positioning=a.get("positioning"),
        differentiator=a.get("differentiator"),
        core_problem=a.get("core_problem"),
        buyer_pain=a.get("buyer_pain"),
        target_segment=primary_icp.get("icp"),
        confidence_score=analysis.get("confidence_score"),
        icp_data=analysis,
        gtm_strategy=analysis.get("gtm_strategy"),
        buyer_persona=analysis.get("buyer_persona"),
    )
    existing = await db.execute(select(company_profiles).where(company_profiles.c.customer_id == customer_id))
    row = existing.first()
    if row:
        await db.execute(update(company_profiles).where(company_profiles.c.id == row.id).values(**values))
    else:
        await db.execute(insert(company_profiles).values(customer_id=customer_id, **values))


@router.post("/generate")
async def generate_icp(body: ICPGenerateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    request_id = uuid.uuid4()
    api_url = os.environ.get("ICP_ENGINE_API_URL", "").strip()
    payload = {
        "product_description": body.productDescription,
        "target_geography": ", ".join(body.countries) if body.countries else "Global",
        "business_stage": body.businessStage,
        "priority": body.priority,
        "company_name": body.companyName,
        "product_name": body.productName,
    }

    result = None
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(api_url, json=payload)
            resp.raise_for_status()
            analysis = resp.json()
        result = _map_icp_result(analysis)
        await _upsert_company_profile(db, user, body, analysis)
        status = "completed"
    except Exception as e:
        logger.error(f"ICP Engine API call failed: {e}")
        status = "failed"

    await db.execute(
        insert(icp_profiles).values(
            user_id=user["id"],
            request_id=request_id,
            status=status,
            input=body.model_dump(),
            result=result,
        )
    )
    await db.commit()
    return {"request_id": str(request_id), "status": status}


@router.get("/status/{request_id}")
async def get_icp_status(request_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(icp_profiles).where(icp_profiles.c.request_id == request_id, icp_profiles.c.user_id == user["id"]))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="ICP request not found")
    return serialize(row)


@router.get("/latest")
async def get_latest_icp(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(icp_profiles).where(icp_profiles.c.user_id == user["id"]).order_by(icp_profiles.c.created_at.desc()).limit(1)
    )
    row = result.first()
    if not row:
        return None
    return serialize(row)


@router.get("/list")
async def list_icps(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """All of this user's completed ICP generations - lets the Leads page offer a picker instead
    of silently always re-applying whichever one happens to be the most recent."""
    result = await db.execute(
        select(icp_profiles)
        .where(icp_profiles.c.user_id == user["id"], icp_profiles.c.status == "completed")
        .order_by(icp_profiles.c.created_at.desc())
        .limit(30)
    )
    out = []
    for row in result.fetchall():
        input_data = row.input or {}
        out.append({
            "request_id": str(row.request_id),
            "company_name": input_data.get("companyName", "Untitled"),
            "product_name": input_data.get("productName", ""),
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "result": row.result,
        })
    return out

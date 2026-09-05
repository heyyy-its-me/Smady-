import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, insert, update
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from database import get_db
from models import company_profiles
from auth import get_current_user

router = APIRouter(prefix="/api/icp", tags=["icp"])


class ICPGenerateRequest(BaseModel):
    productName: str
    productDescription: str
    companyName: str
    targetGeography: str
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


@router.post("/generate")
async def generate_icp(body: ICPGenerateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    request_id = uuid.uuid4()
    icp_url = os.environ.get("ICP_ENGINE_API_URL", "").strip()

    if not icp_url:
        await db.execute(
            insert(company_profiles).values(
                user_id=user["id"], customer_id=user["id"], request_id=request_id,
                status="webhook_not_configured", input=body.model_dump(),
            )
        )
        await db.commit()
        return {"request_id": str(request_id), "status": "webhook_not_configured"}

    payload = {
        "product_description": body.productDescription,
        "target_geography": body.targetGeography,
        "business_stage": body.businessStage,
        "priority": body.priority,
        "company_name": body.companyName,
        "product_name": body.productName,
    }
    await db.execute(
        insert(company_profiles).values(
            user_id=user["id"], customer_id=user["id"], request_id=request_id, status="pending", input=payload,
        )
    )
    await db.commit()

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(icp_url, json=payload)
            resp.raise_for_status()
            result = resp.json()
    except Exception as e:
        await db.execute(update(company_profiles).where(company_profiles.c.request_id == request_id).values(status="failed"))
        await db.commit()
        raise HTTPException(status_code=502, detail=f"ICP engine request failed: {e}")

    await db.execute(update(company_profiles).where(company_profiles.c.request_id == request_id).values(status="completed", result=result))
    await db.commit()
    return {"request_id": str(request_id), "status": "completed", "result": result}


@router.get("/status/{request_id}")
async def get_icp_status(request_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(company_profiles).where(company_profiles.c.request_id == request_id, company_profiles.c.user_id == user["id"]))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="ICP request not found")
    return serialize(row)


@router.get("/latest")
async def get_latest_icp(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(company_profiles).where(company_profiles.c.user_id == user["id"]).order_by(company_profiles.c.created_at.desc()).limit(1)
    )
    row = result.first()
    if not row:
        return None
    return serialize(row)

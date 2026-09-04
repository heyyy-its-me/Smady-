from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy import select, insert, update
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from database import get_db
from models import icp_profiles
from auth import get_current_user
from webhooks import trigger_webhook, is_webhook_configured, verify_callback_secret

router = APIRouter(prefix="/api/icp", tags=["icp"])


class ICPGenerateRequest(BaseModel):
    productName: str
    productDescription: str
    companyName: str
    companyDetails: str
    countries: List[str] = []
    industries: List[str] = []


class ICPResult(BaseModel):
    industry: List[str]
    targetRoles: List[str]
    companySize: List[str]
    geography: List[str]
    painPoints: List[str]


class ICPCallbackRequest(BaseModel):
    request_id: str
    status: str
    result: Optional[ICPResult] = None


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
    configured = is_webhook_configured("icp")
    await db.execute(
        insert(icp_profiles).values(
            user_id=user["id"],
            request_id=request_id,
            status="pending" if configured else "webhook_not_configured",
            input=body.model_dump(),
        )
    )
    await db.commit()
    if configured:
        await trigger_webhook("icp", {"request_id": str(request_id), "user_id": user["id"], **body.model_dump()})
    return {"request_id": str(request_id), "status": "pending" if configured else "webhook_not_configured"}


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


@router.post("/callback")
async def icp_callback(body: ICPCallbackRequest, x_callback_secret: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)):
    verify_callback_secret(x_callback_secret)
    result = await db.execute(select(icp_profiles).where(icp_profiles.c.request_id == body.request_id))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="ICP request not found")
    await db.execute(
        update(icp_profiles).where(icp_profiles.c.request_id == body.request_id).values(
            status=body.status, result=body.result.model_dump() if body.result else None
        )
    )
    await db.commit()
    return {"message": "ICP profile updated"}

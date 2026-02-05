"""Billing endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_org_id
from app.core.database import get_db
from app.models.organization import PlanTier
from app.schemas.common import MessageResponse
from app.services import organization_service, usage_service

router = APIRouter()


class SubscribeRequest(BaseModel):
    plan: PlanTier


@router.get("/usage")
async def get_usage(
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Get current month's usage summary."""
    return await usage_service.get_current_usage(org_id, db)


@router.get("/invoices")
async def get_invoices(org_id: UUID = Depends(get_current_org_id)):
    """Get billing invoices from Stripe."""
    return []


@router.post("/subscribe", response_model=MessageResponse)
async def subscribe(
    body: SubscribeRequest,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Change subscription plan."""
    await organization_service.change_plan(org_id, body.plan, db)
    return MessageResponse(message=f"Plan changed to {body.plan.value}")


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    return {"received": True}

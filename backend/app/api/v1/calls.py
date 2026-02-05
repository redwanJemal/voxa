"""Call log endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_org_id
from app.core.database import get_db
from app.schemas.call import CallAnalytics, CallFilters, CallResponse
from app.services import call_service

router = APIRouter()


@router.get("")
async def list_calls(
    agent_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """List calls with pagination and optional filters."""
    filters = CallFilters(agent_id=agent_id, page=page, page_size=page_size)
    return await call_service.list_calls(org_id, filters, db)


@router.get("/analytics", response_model=CallAnalytics)
async def get_analytics(
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregate call analytics."""
    return await call_service.get_analytics(org_id, db)


@router.get("/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: UUID,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Get call details with transcript."""
    return await call_service.get_call(call_id, org_id, db)

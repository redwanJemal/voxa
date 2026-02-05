"""Call service — logging and analytics."""

from uuid import UUID

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.call import Call, CallStatus
from app.schemas.call import CallAnalytics, CallBrief, CallFilters, CallResponse

logger = structlog.get_logger("call_service")


async def list_calls(org_id: UUID, filters: CallFilters, db: AsyncSession) -> dict:
    """List calls with pagination and filters."""
    query = select(Call).where(Call.organization_id == org_id)
    query = _apply_filters(query, filters)
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Call.created_at.desc())
    query = query.offset((filters.page - 1) * filters.page_size).limit(filters.page_size)
    result = await db.execute(query)
    calls = [CallBrief.model_validate(c) for c in result.scalars().all()]

    return {"items": calls, "total": total, "page": filters.page, "page_size": filters.page_size}


async def get_call(call_id: UUID, org_id: UUID, db: AsyncSession) -> CallResponse:
    """Get a call with full transcript."""
    result = await db.execute(
        select(Call).where(Call.id == call_id, Call.organization_id == org_id)
    )
    call = result.scalar_one_or_none()
    if not call:
        raise NotFoundException("Call", str(call_id))
    return CallResponse.model_validate(call)


async def get_analytics(org_id: UUID, db: AsyncSession) -> CallAnalytics:
    """Get aggregate call analytics for an organization."""
    base = select(Call).where(Call.organization_id == org_id)
    result = await db.execute(
        select(
            func.count(Call.id),
            func.coalesce(func.sum(Call.duration_seconds), 0),
            func.coalesce(func.avg(Call.duration_seconds), 0),
            func.coalesce(func.sum(Call.cost_cents), 0),
        ).where(Call.organization_id == org_id)
    )
    row = result.one()
    return CallAnalytics(
        total_calls=row[0],
        total_duration_seconds=row[1],
        average_duration_seconds=float(row[2]),
        total_cost_cents=row[3],
        calls_by_status={},
        calls_by_day=[],
    )


def _apply_filters(query, filters: CallFilters):
    """Apply optional filters to a call query."""
    if filters.agent_id:
        query = query.where(Call.agent_id == filters.agent_id)
    if filters.status:
        query = query.where(Call.status == filters.status)
    if filters.date_from:
        query = query.where(Call.created_at >= filters.date_from)
    if filters.date_to:
        query = query.where(Call.created_at <= filters.date_to)
    return query

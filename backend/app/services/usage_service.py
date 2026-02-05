"""Usage service — tracking and billing."""

from datetime import UTC, datetime
from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.usage import UsageRecord

logger = structlog.get_logger("usage_service")


async def track_usage(
    org_id: UUID,
    resource_type: str,
    quantity: float,
    unit: str,
    cost_cents: int,
    db: AsyncSession,
) -> None:
    """Record a usage event."""
    now = datetime.now(UTC)
    record = UsageRecord(
        organization_id=org_id,
        resource_type=resource_type,
        quantity=quantity,
        unit=unit,
        cost_cents=cost_cents,
        period_year=now.year,
        period_month=now.month,
    )
    db.add(record)
    await db.flush()


async def get_current_usage(org_id: UUID, db: AsyncSession) -> list[dict]:
    """Get current month's usage summary by resource type."""
    now = datetime.now(UTC)
    result = await db.execute(
        select(UsageRecord).where(
            UsageRecord.organization_id == org_id,
            UsageRecord.period_year == now.year,
            UsageRecord.period_month == now.month,
        )
    )
    records = result.scalars().all()
    summary: dict[str, dict] = {}
    for r in records:
        key = r.resource_type
        if key not in summary:
            summary[key] = {"resource": key, "total": 0.0, "unit": r.unit, "cost_cents": 0}
        summary[key]["total"] += r.quantity
        summary[key]["cost_cents"] += r.cost_cents
    return list(summary.values())

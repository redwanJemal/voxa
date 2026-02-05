"""Organization service — CRUD and plan management."""

from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.organization import PLAN_LIMITS, Organization, PlanTier
from app.schemas.organization import OrganizationResponse, OrganizationUpdate

logger = structlog.get_logger("org_service")


async def get_organization(org_id: UUID, db: AsyncSession) -> Organization:
    """Get organization by ID."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise NotFoundException("Organization", str(org_id))
    return org


async def get_organization_response(org_id: UUID, db: AsyncSession) -> OrganizationResponse:
    """Get organization response schema."""
    org = await get_organization(org_id, db)
    return OrganizationResponse.model_validate(org)


async def update_organization(
    org_id: UUID, data: OrganizationUpdate, db: AsyncSession
) -> OrganizationResponse:
    """Update organization settings."""
    org = await get_organization(org_id, db)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)
    await db.flush()
    logger.info("org_updated", org_id=str(org_id))
    return OrganizationResponse.model_validate(org)


async def change_plan(org_id: UUID, new_plan: PlanTier, db: AsyncSession) -> OrganizationResponse:
    """Change organization plan and update limits."""
    org = await get_organization(org_id, db)
    limits = PLAN_LIMITS[new_plan]
    org.plan = new_plan
    org.max_agents = limits["max_agents"]
    org.max_kb_size_mb = limits["max_kb_size_mb"]
    org.max_concurrent_calls = limits["max_concurrent_calls"]
    await db.flush()
    logger.info("plan_changed", org_id=str(org_id), plan=new_plan)
    return OrganizationResponse.model_validate(org)

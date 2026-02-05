"""Agent service — CRUD and validation."""

from uuid import UUID

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.agent import Agent
from app.models.organization import Organization
from app.schemas.agent import AgentBrief, AgentCreate, AgentResponse, AgentUpdate

logger = structlog.get_logger("agent_service")


async def list_agents(org_id: UUID, db: AsyncSession) -> list[AgentBrief]:
    """List all agents for an organization."""
    result = await db.execute(
        select(Agent).where(Agent.organization_id == org_id).order_by(Agent.created_at.desc())
    )
    agents = result.scalars().all()
    return [AgentBrief.model_validate(a) for a in agents]


async def get_agent(agent_id: UUID, org_id: UUID, db: AsyncSession) -> AgentResponse:
    """Get a single agent by ID, scoped to organization."""
    agent = await _get_agent_or_raise(agent_id, org_id, db)
    return AgentResponse.model_validate(agent)


async def create_agent(data: AgentCreate, org_id: UUID, db: AsyncSession) -> AgentResponse:
    """Create a new agent after validating plan limits."""
    await _check_agent_limit(org_id, db)
    agent = Agent(organization_id=org_id, **data.model_dump())
    db.add(agent)
    await db.flush()
    logger.info("agent_created", agent_id=str(agent.id), org_id=str(org_id))
    return AgentResponse.model_validate(agent)


async def update_agent(
    agent_id: UUID, data: AgentUpdate, org_id: UUID, db: AsyncSession
) -> AgentResponse:
    """Update an existing agent."""
    agent = await _get_agent_or_raise(agent_id, org_id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)
    await db.flush()
    logger.info("agent_updated", agent_id=str(agent_id))
    return AgentResponse.model_validate(agent)


async def delete_agent(agent_id: UUID, org_id: UUID, db: AsyncSession) -> None:
    """Delete an agent."""
    agent = await _get_agent_or_raise(agent_id, org_id, db)
    await db.delete(agent)
    await db.flush()
    logger.info("agent_deleted", agent_id=str(agent_id))


async def _get_agent_or_raise(agent_id: UUID, org_id: UUID, db: AsyncSession) -> Agent:
    """Fetch agent scoped to org, raise if not found."""
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.organization_id == org_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise NotFoundException("Agent", str(agent_id))
    return agent


async def _check_agent_limit(org_id: UUID, db: AsyncSession) -> None:
    """Ensure org hasn't exceeded agent creation limit."""
    org = await db.get(Organization, org_id)
    if not org:
        raise NotFoundException("Organization", str(org_id))
    count_result = await db.execute(
        select(func.count()).where(Agent.organization_id == org_id)
    )
    count = count_result.scalar() or 0
    if count >= org.max_agents:
        raise ForbiddenException(f"Agent limit reached ({org.max_agents}). Upgrade your plan.")

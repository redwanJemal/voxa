"""Agent CRUD endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_org_id, get_current_user_id
from app.core.database import get_db
from app.core.security import create_access_token
from app.schemas.agent import AgentBrief, AgentCreate, AgentResponse, AgentUpdate
from app.schemas.common import MessageResponse
from app.services import agent_service


class WidgetTokenResponse(BaseModel):
    token: str
    agent_id: str
    embed_code: str

router = APIRouter()


@router.get("", response_model=list[AgentBrief])
async def list_agents(
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """List all agents for the current organization."""
    return await agent_service.list_agents(org_id, db)


@router.post("", response_model=AgentResponse, status_code=201)
async def create_agent(
    body: AgentCreate,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new voice agent."""
    return await agent_service.create_agent(body, org_id, db)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: UUID,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Get agent details."""
    return await agent_service.get_agent(agent_id, org_id, db)


@router.patch("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: UUID,
    body: AgentUpdate,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Update agent configuration."""
    return await agent_service.update_agent(agent_id, body, org_id, db)


@router.delete("/{agent_id}", response_model=MessageResponse)
async def delete_agent(
    agent_id: UUID,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete an agent."""
    await agent_service.delete_agent(agent_id, org_id, db)
    return MessageResponse(message="Agent deleted")


@router.post("/{agent_id}/test", response_model=MessageResponse)
async def test_agent(agent_id: UUID):
    """Initiate a test voice call with the agent."""
    return MessageResponse(message=f"Test call initiated for agent {agent_id}")


@router.post("/{agent_id}/widget-token", response_model=WidgetTokenResponse)
async def generate_widget_token(
    agent_id: UUID,
    org_id: UUID = Depends(get_current_org_id),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Generate an embeddable widget token for this agent (90-day expiry)."""
    # Verify agent belongs to org
    agent = await agent_service.get_agent(agent_id, org_id, db)
    
    # Create long-lived token (90 days)
    token = create_access_token(
        data={"sub": user_id, "email": "widget@voxa.dev", "agent_id": str(agent_id)},
        expires_minutes=60 * 24 * 90,  # 90 days
    )
    
    embed_code = f'''<!-- Voxa Voice Widget -->
<script
  src="https://voxa.redwanjemal.dev/widget/voxa-widget.js"
  data-agent-id="{agent_id}"
  data-token="{token}"
  data-api-url="https://voxa.redwanjemal.dev"
  async
></script>'''
    
    return WidgetTokenResponse(
        token=token,
        agent_id=str(agent_id),
        embed_code=embed_code,
    )

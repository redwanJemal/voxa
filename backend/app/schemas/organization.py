"""Organization schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.organization import PlanTier


class OrganizationCreate(BaseModel):
    name: str
    slug: str


class OrganizationUpdate(BaseModel):
    name: str | None = None
    settings: dict | None = None


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    plan: PlanTier
    max_agents: int
    max_kb_size_mb: int
    max_concurrent_calls: int
    settings: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class OrganizationBrief(BaseModel):
    id: UUID
    name: str
    slug: str
    plan: PlanTier

    model_config = {"from_attributes": True}

"""Organization model."""

import enum

from sqlalchemy import Enum, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class PlanTier(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


# Default limits per plan
PLAN_LIMITS: dict[PlanTier, dict[str, int]] = {
    PlanTier.FREE: {"max_agents": 1, "max_kb_size_mb": 10, "max_concurrent_calls": 1},
    PlanTier.STARTER: {"max_agents": 5, "max_kb_size_mb": 100, "max_concurrent_calls": 3},
    PlanTier.PRO: {"max_agents": 25, "max_kb_size_mb": 500, "max_concurrent_calls": 10},
    PlanTier.ENTERPRISE: {"max_agents": 100, "max_kb_size_mb": 5000, "max_concurrent_calls": 50},
}


class Organization(BaseModel):
    """Tenant organization for multi-tenancy."""

    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    plan: Mapped[PlanTier] = mapped_column(Enum(PlanTier), default=PlanTier.FREE, nullable=False)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    max_agents: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    max_kb_size_mb: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    max_concurrent_calls: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    members = relationship("User", back_populates="organization")
    agents = relationship("Agent", back_populates="organization", cascade="all, delete-orphan")

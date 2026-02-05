"""Provider API key model — stores encrypted tenant API keys."""

import uuid

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ProviderKey(BaseModel):
    """Encrypted API key for an external provider (OpenAI, Deepgram, etc.)."""

    __tablename__ = "provider_keys"
    __table_args__ = (
        UniqueConstraint("organization_id", "provider", name="uq_org_provider"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    encrypted_key: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    organization = relationship("Organization", backref="provider_keys")

"""Agent model."""

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Agent(BaseModel):
    """Voice AI agent configuration."""

    __tablename__ = "agents"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    system_prompt: Mapped[str] = mapped_column(Text, default="You are a helpful assistant.")
    greeting_message: Mapped[str] = mapped_column(
        String(1000), default="Hello! How can I help you today?"
    )
    llm_model: Mapped[str] = mapped_column(String(100), default="gpt-4o-mini")
    stt_provider: Mapped[str] = mapped_column(String(50), default="deepgram")
    tts_provider: Mapped[str] = mapped_column(String(50), default="deepgram")
    tts_voice: Mapped[str] = mapped_column(String(100), default="aura-asteria-en")
    language: Mapped[str] = mapped_column(String(10), default="en")
    max_call_duration_seconds: Mapped[int] = mapped_column(Integer, default=600)
    tools: Mapped[dict] = mapped_column(JSONB, default=dict)
    agent_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    organization = relationship("Organization", back_populates="agents")
    knowledge_bases = relationship(
        "KnowledgeBase", back_populates="agent", cascade="all, delete-orphan"
    )
    calls = relationship("Call", back_populates="agent", cascade="all, delete-orphan")

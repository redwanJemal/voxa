"""Agent schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    system_prompt: str = "You are a helpful assistant."
    greeting_message: str = "Hello! How can I help you today?"
    llm_model: str = "gpt-4o-mini"
    stt_provider: str = "deepgram"
    tts_provider: str = "deepgram"
    tts_voice: str = "aura-asteria-en"
    language: str = "en"
    max_call_duration_seconds: int = Field(default=600, ge=30, le=3600)
    tools: dict = Field(default_factory=dict)


class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    greeting_message: str | None = None
    llm_model: str | None = None
    stt_provider: str | None = None
    tts_provider: str | None = None
    tts_voice: str | None = None
    language: str | None = None
    max_call_duration_seconds: int | None = None
    tools: dict | None = None
    is_active: bool | None = None


class AgentResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    description: str | None
    system_prompt: str
    greeting_message: str
    llm_model: str
    stt_provider: str
    tts_provider: str
    tts_voice: str
    language: str
    max_call_duration_seconds: int
    tools: dict
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentBrief(BaseModel):
    id: UUID
    name: str
    description: str | None
    llm_model: str
    language: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

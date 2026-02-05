"""Call schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.call import CallStatus


class CallResponse(BaseModel):
    id: UUID
    agent_id: UUID
    organization_id: UUID
    caller_id: str | None
    status: CallStatus
    duration_seconds: int
    transcript: str | None
    summary: str | None
    sentiment_score: float | None
    cost_cents: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CallBrief(BaseModel):
    id: UUID
    agent_id: UUID
    caller_id: str | None
    status: CallStatus
    duration_seconds: int
    sentiment_score: float | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CallAnalytics(BaseModel):
    total_calls: int
    total_duration_seconds: int
    average_duration_seconds: float
    total_cost_cents: int
    calls_by_status: dict[str, int]
    calls_by_day: list[dict[str, int | str]]


class CallFilters(BaseModel):
    agent_id: UUID | None = None
    status: CallStatus | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    page: int = 1
    page_size: int = 20

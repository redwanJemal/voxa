"""Provider key schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProviderKeyCreate(BaseModel):
    provider: str = Field(min_length=1, max_length=50)
    api_key: str = Field(min_length=1)
    label: str | None = None


class ProviderKeyResponse(BaseModel):
    id: UUID
    provider: str
    label: str | None
    masked_key: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProviderKeyTestResult(BaseModel):
    provider: str
    success: bool
    message: str

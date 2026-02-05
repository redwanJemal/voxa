"""User schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    avatar_url: str | None = None
    google_id: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    avatar_url: str | None = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    avatar_url: str | None
    role: UserRole
    organization_id: UUID | None
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    id: UUID
    email: str
    name: str
    avatar_url: str | None
    role: UserRole

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str

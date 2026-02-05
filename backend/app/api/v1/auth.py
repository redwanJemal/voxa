"""Authentication endpoints."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import generate_api_key, hash_api_key
from app.models.api_key import ApiKey
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.user import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import (
    google_authenticate,
    login_user,
    refresh_tokens,
    register_user,
)

router = APIRouter()


class GoogleAuthRequest(BaseModel):
    access_token: str


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class ApiKeyRequest(BaseModel):
    name: str


class ApiKeyResponse(BaseModel):
    key: str
    name: str
    prefix: str


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user with email and password."""
    return await register_user(body.name, body.email, body.password, db)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email and password."""
    return await login_user(body.email, body.password, db)


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return UserResponse.model_validate(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token."""
    return await refresh_tokens(body.refresh_token, db)


@router.post("/google", response_model=AuthResponse)
async def google_auth(
    body: GoogleAuthRequest, db: AsyncSession = Depends(get_db)
):
    """Authenticate with Google OAuth access token."""
    return await google_authenticate(body.access_token, db)


@router.post("/logout", response_model=MessageResponse)
async def logout():
    """Logout — client should discard token."""
    return MessageResponse(message="Logged out successfully")


@router.post("/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    body: ApiKeyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new API key for the current user."""
    raw_key = generate_api_key()
    api_key = ApiKey(
        user_id=user.id,
        name=body.name,
        key_hash=hash_api_key(raw_key),
        key_prefix=raw_key[:8],
    )
    db.add(api_key)
    await db.flush()
    return ApiKeyResponse(key=raw_key, name=body.name, prefix=raw_key[:8])

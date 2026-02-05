"""Authentication service — Email/Password + Google OAuth + JWT."""

from datetime import UTC, datetime

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedException, ValidationException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)
from app.models.organization import Organization
from app.models.user import AuthProvider, User, UserRole
from app.schemas.user import TokenResponse, UserResponse

logger = structlog.get_logger("auth")

GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def _build_token_response(user: User) -> TokenResponse:
    """Build JWT token response for a user."""
    token_data = {"sub": str(user.id), "email": user.email}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user=UserResponse.model_validate(user),
    )


async def register_user(
    name: str, email: str, password: str, db: AsyncSession
) -> TokenResponse:
    """Register a new user with email/password."""
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise ValidationException("A user with this email already exists")

    slug = email.split("@")[0].lower().replace(".", "-")
    org = Organization(name=f"{name}'s Org", slug=slug)
    db.add(org)
    await db.flush()

    user = User(
        email=email,
        name=name,
        password_hash=hash_password(password),
        auth_provider=AuthProvider.EMAIL,
        organization_id=org.id,
        role=UserRole.OWNER,
        last_login_at=datetime.now(UTC),
    )
    db.add(user)
    await db.flush()

    logger.info("user_registered", email=email, org_id=str(org.id))
    return _build_token_response(user)


async def login_user(email: str, password: str, db: AsyncSession) -> TokenResponse:
    """Authenticate user with email/password."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise UnauthorizedException("Invalid email or password")

    if not verify_password(password, user.password_hash):
        raise UnauthorizedException("Invalid email or password")

    if not user.is_active:
        raise UnauthorizedException("Account is deactivated")

    user.last_login_at = datetime.now(UTC)
    await db.flush()

    logger.info("user_logged_in", email=email)
    return _build_token_response(user)


async def refresh_tokens(refresh_token: str, db: AsyncSession) -> TokenResponse:
    """Refresh access token using a valid refresh token."""
    payload = verify_token(refresh_token)
    if payload.get("type") != "refresh":
        raise UnauthorizedException("Invalid refresh token")

    result = await db.execute(
        select(User).where(User.id == payload["sub"])
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise UnauthorizedException("User not found or deactivated")

    return _build_token_response(user)


async def google_authenticate(access_token: str, db: AsyncSession) -> dict:
    """Authenticate with Google OAuth token, create user if needed."""
    user_info = await _fetch_google_user_info(access_token)
    user = await _get_or_create_google_user(user_info, db)
    user.last_login_at = datetime.now(UTC)
    await db.flush()
    token_resp = _build_token_response(user)
    return {"token": token_resp.access_token, "user": token_resp.user}


async def _fetch_google_user_info(access_token: str) -> dict:
    """Fetch user info from Google OAuth."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()


async def _get_or_create_google_user(info: dict, db: AsyncSession) -> User:
    """Find existing user by Google ID or email, or create new one."""
    stmt = select(User).where(
        (User.google_id == info["sub"]) | (User.email == info["email"])
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user:
        user.google_id = info["sub"]
        user.avatar_url = info.get("picture")
        return user

    slug = info["email"].split("@")[0].lower().replace(".", "-")
    org = Organization(name=f"{info.get('name', 'My')} Org", slug=slug)
    db.add(org)
    await db.flush()

    user = User(
        email=info["email"],
        name=info.get("name", info["email"]),
        avatar_url=info.get("picture"),
        google_id=info["sub"],
        auth_provider=AuthProvider.GOOGLE,
        organization_id=org.id,
        role=UserRole.OWNER,
    )
    db.add(user)
    await db.flush()
    logger.info("google_user_created", email=user.email, org_id=str(org.id))
    return user

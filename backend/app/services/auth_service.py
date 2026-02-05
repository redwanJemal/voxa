"""Authentication service — Google OAuth + JWT."""

from datetime import UTC, datetime

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.schemas.user import UserResponse

logger = structlog.get_logger("auth")

GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


async def google_authenticate(access_token: str, db: AsyncSession) -> dict:
    """Authenticate with Google OAuth token, create user if needed."""
    user_info = await _fetch_google_user_info(access_token)
    user = await _get_or_create_user(user_info, db)
    user.last_login_at = datetime.now(UTC)
    await db.flush()
    jwt_token = create_access_token({"sub": str(user.id), "email": user.email})
    return {"token": jwt_token, "user": UserResponse.model_validate(user)}


async def _fetch_google_user_info(access_token: str) -> dict:
    """Fetch user info from Google OAuth."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()


async def _get_or_create_user(info: dict, db: AsyncSession) -> User:
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

    return await _create_user_with_org(info, db)


async def _create_user_with_org(info: dict, db: AsyncSession) -> User:
    """Create a new user and their default organization."""
    slug = info["email"].split("@")[0].lower().replace(".", "-")
    org = Organization(name=f"{info.get('name', 'My')} Org", slug=slug)
    db.add(org)
    await db.flush()

    user = User(
        email=info["email"],
        name=info.get("name", info["email"]),
        avatar_url=info.get("picture"),
        google_id=info["sub"],
        organization_id=org.id,
        role=UserRole.OWNER,
    )
    db.add(user)
    await db.flush()
    logger.info("user_created", email=user.email, org_id=str(org.id))
    return user

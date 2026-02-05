"""Common API dependencies."""

from uuid import UUID

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenException
from app.core.security import get_current_user_id
from app.models.user import User, UserRole
from app.services.user_service import get_user_by_id


async def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get the full current user object."""
    return await get_user_by_id(UUID(user_id), db)


async def get_current_org_id(
    user: User = Depends(get_current_user),
) -> UUID:
    """Get the current user's organization ID."""
    if not user.organization_id:
        raise ForbiddenException("User is not part of an organization")
    return user.organization_id


def require_role(*roles: UserRole):
    """Dependency factory that checks user role."""

    async def check_role(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise ForbiddenException(f"Requires role: {', '.join(r.value for r in roles)}")
        return user

    return check_role

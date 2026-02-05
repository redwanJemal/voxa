"""User service — CRUD operations."""

from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

logger = structlog.get_logger("user_service")


async def get_user_by_id(user_id: UUID, db: AsyncSession) -> User:
    """Get user by ID or raise NotFoundException."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException("User", str(user_id))
    return user


async def get_user_response(user_id: UUID, db: AsyncSession) -> UserResponse:
    """Get user response schema by ID."""
    user = await get_user_by_id(user_id, db)
    return UserResponse.model_validate(user)


async def update_user(user_id: UUID, data: UserUpdate, db: AsyncSession) -> UserResponse:
    """Update user profile fields."""
    user = await get_user_by_id(user_id, db)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.flush()
    logger.info("user_updated", user_id=str(user_id))
    return UserResponse.model_validate(user)

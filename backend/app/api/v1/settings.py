"""Settings API — manage tenant provider API keys."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_org_id
from app.core.database import get_db
from app.core.exceptions import NotFoundException
from app.schemas.provider_key import (
    ProviderKeyCreate,
    ProviderKeyResponse,
    ProviderKeyTestResult,
)
from app.services import provider_key_service

router = APIRouter()


@router.get("/api-keys", response_model=list[ProviderKeyResponse])
async def list_api_keys(
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """List all provider keys for the current organization (masked)."""
    return await provider_key_service.get_all_keys(org_id, db)


@router.post("/api-keys", response_model=ProviderKeyResponse)
async def save_api_key(
    payload: ProviderKeyCreate,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Save or update a provider API key."""
    result = await provider_key_service.save_key(
        org_id, payload.provider, payload.api_key, payload.label, db
    )
    await db.commit()
    return result


@router.delete("/api-keys/{provider}")
async def delete_api_key(
    provider: str,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a provider API key."""
    deleted = await provider_key_service.delete_key(org_id, provider, db)
    if not deleted:
        raise NotFoundException("ProviderKey", provider)
    await db.commit()
    return {"detail": "Key deleted"}


@router.post("/api-keys/{provider}/test", response_model=ProviderKeyTestResult)
async def test_api_key(
    provider: str,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Test whether the stored key for a provider works."""
    raw_key = await provider_key_service.get_key(org_id, provider, db)
    if raw_key is None:
        raise NotFoundException("ProviderKey", provider)
    success, message = await provider_key_service.test_key(provider, raw_key)
    return ProviderKeyTestResult(provider=provider, success=success, message=message)

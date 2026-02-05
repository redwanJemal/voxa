"""Provider key service — CRUD + encryption + testing."""

from uuid import UUID

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.provider_key import ProviderKey
from app.schemas.provider_key import ProviderKeyResponse
from app.services.crypto_service import decrypt, encrypt

logger = structlog.get_logger("provider_key_service")


def _mask_key(raw: str) -> str:
    """Return a masked representation like 'sk-...xxxx'."""
    if len(raw) <= 8:
        return "****"
    return f"{raw[:4]}...{raw[-4:]}"


async def get_key(org_id: UUID, provider: str, db: AsyncSession) -> str | None:
    """Decrypt and return the raw API key for a provider."""
    result = await db.execute(
        select(ProviderKey).where(
            ProviderKey.organization_id == org_id,
            ProviderKey.provider == provider,
            ProviderKey.is_active == True,  # noqa: E712
        )
    )
    pk = result.scalar_one_or_none()
    if pk is None:
        return None
    return decrypt(pk.encrypted_key)


async def get_all_keys(org_id: UUID, db: AsyncSession) -> list[ProviderKeyResponse]:
    """List all provider keys (masked) for an organization."""
    result = await db.execute(
        select(ProviderKey)
        .where(ProviderKey.organization_id == org_id)
        .order_by(ProviderKey.provider)
    )
    keys = result.scalars().all()
    out: list[ProviderKeyResponse] = []
    for k in keys:
        raw = decrypt(k.encrypted_key)
        out.append(
            ProviderKeyResponse(
                id=k.id,
                provider=k.provider,
                label=k.label,
                masked_key=_mask_key(raw),
                is_active=k.is_active,
                created_at=k.created_at,
                updated_at=k.updated_at,
            )
        )
    return out


async def save_key(
    org_id: UUID, provider: str, api_key: str, label: str | None, db: AsyncSession
) -> ProviderKeyResponse:
    """Encrypt and upsert a provider key."""
    result = await db.execute(
        select(ProviderKey).where(
            ProviderKey.organization_id == org_id,
            ProviderKey.provider == provider,
        )
    )
    pk = result.scalar_one_or_none()
    encrypted = encrypt(api_key)

    if pk:
        pk.encrypted_key = encrypted
        pk.label = label
        pk.is_active = True
    else:
        pk = ProviderKey(
            organization_id=org_id,
            provider=provider,
            encrypted_key=encrypted,
            label=label,
            is_active=True,
        )
        db.add(pk)

    await db.flush()
    await db.refresh(pk)
    logger.info("provider_key_saved", provider=provider, org_id=str(org_id))
    return ProviderKeyResponse(
        id=pk.id,
        provider=pk.provider,
        label=pk.label,
        masked_key=_mask_key(api_key),
        is_active=pk.is_active,
        created_at=pk.created_at,
        updated_at=pk.updated_at,
    )


async def delete_key(org_id: UUID, provider: str, db: AsyncSession) -> bool:
    """Delete a provider key. Returns True if deleted."""
    result = await db.execute(
        select(ProviderKey).where(
            ProviderKey.organization_id == org_id,
            ProviderKey.provider == provider,
        )
    )
    pk = result.scalar_one_or_none()
    if pk is None:
        return False
    await db.delete(pk)
    await db.flush()
    logger.info("provider_key_deleted", provider=provider, org_id=str(org_id))
    return True


async def test_key(provider: str, api_key: str) -> tuple[bool, str]:
    """Test whether a provider API key is valid with a lightweight call."""
    try:
        if provider == "openai":
            return await _test_openai(api_key)
        elif provider == "deepgram":
            return await _test_deepgram(api_key)
        elif provider == "google":
            return await _test_google(api_key)
        elif provider == "anthropic":
            return await _test_anthropic(api_key)
        elif provider == "groq":
            return await _test_groq(api_key)
        elif provider == "deepseek":
            return await _test_deepseek(api_key)
        else:
            return False, f"Unknown provider: {provider}"
    except Exception as exc:
        logger.error("key_test_failed", provider=provider, error=str(exc))
        return False, str(exc)


async def _test_openai(api_key: str) -> tuple[bool, str]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
    if r.status_code == 200:
        return True, "OpenAI key is valid"
    return False, f"OpenAI returned {r.status_code}: {r.text[:200]}"


async def _test_deepgram(api_key: str) -> tuple[bool, str]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.deepgram.com/v1/projects",
            headers={"Authorization": f"Token {api_key}"},
            timeout=10,
        )
    if r.status_code == 200:
        return True, "Deepgram key is valid"
    return False, f"Deepgram returned {r.status_code}: {r.text[:200]}"


async def _test_google(api_key: str) -> tuple[bool, str]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}",
            timeout=10,
        )
    if r.status_code == 200:
        return True, "Google AI key is valid"
    return False, f"Google returned {r.status_code}: {r.text[:200]}"


async def _test_anthropic(api_key: str) -> tuple[bool, str]:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-3-5-haiku-latest",
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "hi"}],
            },
            timeout=15,
        )
    # 200 = works, 400 can still mean auth ok (depends on body)
    if r.status_code in (200, 201):
        return True, "Anthropic key is valid"
    if r.status_code == 401:
        return False, "Anthropic key is invalid (401 Unauthorized)"
    # If we get a 400 (bad request) but not 401 → key is probably fine
    if r.status_code == 400:
        return True, "Anthropic key appears valid"
    return False, f"Anthropic returned {r.status_code}: {r.text[:200]}"


async def _test_groq(api_key: str) -> tuple[bool, str]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
    if r.status_code == 200:
        return True, "Groq key is valid"
    return False, f"Groq returned {r.status_code}: {r.text[:200]}"


async def _test_deepseek(api_key: str) -> tuple[bool, str]:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.deepseek.com/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
    if r.status_code == 200:
        return True, "DeepSeek key is valid"
    return False, f"DeepSeek returned {r.status_code}: {r.text[:200]}"

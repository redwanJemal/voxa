"""Generate embeddings via OpenAI."""

import structlog
from openai import AsyncOpenAI

from app.core.config import settings

logger = structlog.get_logger("embeddings")

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536

# Module-level API key override for tenant-specific keys
_api_key_override: str | None = None


def set_api_key(api_key: str | None) -> None:
    """Set the API key to use for embeddings (tenant-specific)."""
    global _api_key_override
    _api_key_override = api_key


def _get_api_key() -> str | None:
    """Get the API key - tenant override or fallback to settings."""
    return _api_key_override or settings.OPENAI_API_KEY


async def generate_embedding(text: str, api_key: str | None = None) -> list[float]:
    """Generate a single embedding vector for text."""
    key = api_key or _get_api_key()
    client = AsyncOpenAI(api_key=key)
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    return response.data[0].embedding


async def generate_embeddings(texts: list[str], api_key: str | None = None) -> list[list[float]]:
    """Generate embedding vectors for multiple texts."""
    if not texts:
        return []

    key = api_key or _get_api_key()
    client = AsyncOpenAI(api_key=key)
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    sorted_data = sorted(response.data, key=lambda x: x.index)
    return [item.embedding for item in sorted_data]

"""Redis cache utilities with decorator support."""

import functools
import json
from typing import Any, Callable

import redis.asyncio as redis

from app.core.config import settings

_redis_client: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    """Get or create Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


async def cache_get(key: str) -> Any | None:
    """Get a value from cache."""
    client = await get_redis()
    value = await client.get(key)
    if value is None:
        return None
    return json.loads(value)


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """Set a value in cache with TTL in seconds."""
    client = await get_redis()
    await client.set(key, json.dumps(value, default=str), ex=ttl)


async def cache_delete(key: str) -> None:
    """Delete a key from cache."""
    client = await get_redis()
    await client.delete(key)


async def cache_delete_pattern(pattern: str) -> None:
    """Delete all keys matching a pattern."""
    client = await get_redis()
    keys = []
    async for key in client.scan_iter(match=pattern):
        keys.append(key)
    if keys:
        await client.delete(*keys)


def make_cache_key(prefix: str, *args: Any) -> str:
    """Generate a consistent cache key."""
    parts = [prefix] + [str(a) for a in args]
    return ":".join(parts)


def cached(ttl: int = 300, prefix: str = "") -> Callable:
    """Decorator to cache function results in Redis."""

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            key_prefix = prefix or f"cache:{func.__module__}.{func.__name__}"
            cache_key = make_cache_key(key_prefix, *args, *sorted(kwargs.items()))
            result = await cache_get(cache_key)
            if result is not None:
                return result
            result = await func(*args, **kwargs)
            await cache_set(cache_key, result, ttl)
            return result

        return wrapper

    return decorator

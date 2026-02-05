"""Cache service — high-level wrapper around core/cache."""

from typing import Any

from app.core.cache import cache_delete, cache_delete_pattern, cache_get, cache_set, make_cache_key


async def get_cached_agent(agent_id: str) -> dict | None:
    """Get agent config from cache."""
    return await cache_get(make_cache_key("agent", agent_id))


async def set_cached_agent(agent_id: str, data: dict, ttl: int = 300) -> None:
    """Cache agent config."""
    await cache_set(make_cache_key("agent", agent_id), data, ttl)


async def invalidate_agent(agent_id: str) -> None:
    """Invalidate agent cache."""
    await cache_delete(make_cache_key("agent", agent_id))


async def invalidate_org_agents(org_id: str) -> None:
    """Invalidate all cached agents for an organization."""
    await cache_delete_pattern(f"agent:*:{org_id}")


async def get_cached_value(prefix: str, *args: Any) -> Any | None:
    """Generic cache get."""
    return await cache_get(make_cache_key(prefix, *args))


async def set_cached_value(prefix: str, *args: Any, value: Any, ttl: int = 300) -> None:
    """Generic cache set."""
    await cache_set(make_cache_key(prefix, *args), value, ttl)

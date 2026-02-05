"""Redis-based rate limiter with sliding window algorithm."""

import time

from fastapi import Depends, Request

from app.core.cache import get_redis
from app.core.exceptions import RateLimitException
from app.core.security import get_current_user_id


class RateLimiter:
    """Sliding window rate limiter backed by Redis."""

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def check(self, key: str) -> bool:
        """Check if request is within rate limit. Returns True if allowed."""
        client = await get_redis()
        now = time.time()
        window_start = now - self.window_seconds
        pipe = client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, self.window_seconds)
        results = await pipe.execute()
        count = results[2]
        return count <= self.max_requests

    async def check_or_raise(self, key: str) -> None:
        """Check rate limit and raise exception if exceeded."""
        if not await self.check(key):
            raise RateLimitException(
                f"Rate limit exceeded: {self.max_requests} requests per "
                f"{self.window_seconds} seconds"
            )


async def rate_limit_dependency(
    request: Request,
    user_id: str = Depends(get_current_user_id),
) -> None:
    """FastAPI dependency for per-user rate limiting."""
    from app.core.config import settings

    limiter = RateLimiter(
        max_requests=settings.RATE_LIMIT_PER_MINUTE,
        window_seconds=60,
    )
    key = f"rate_limit:{user_id}:{request.url.path}"
    await limiter.check_or_raise(key)

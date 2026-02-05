"""Audit logging middleware for write operations."""

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger("audit")

WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Log all write operations for audit trail."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        if request.method in WRITE_METHODS:
            await self._log_write_operation(request, response)
        return response

    async def _log_write_operation(self, request: Request, response: Response) -> None:
        """Record audit log entry for write operations."""
        user_id = getattr(request.state, "user_id", "anonymous")
        logger.info(
            "audit_event",
            method=request.method,
            path=request.url.path,
            user_id=user_id,
            status_code=response.status_code,
            client_ip=request.client.host if request.client else "unknown",
        )

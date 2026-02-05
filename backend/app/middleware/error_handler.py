"""Global exception handler middleware."""

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.exceptions import VoxaException

logger = structlog.get_logger("error_handler")


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app."""

    @app.exception_handler(VoxaException)
    async def voxa_exception_handler(request: Request, exc: VoxaException) -> JSONResponse:
        logger.warning("voxa_error", message=exc.message, status_code=exc.status_code)
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"message": exc.message, "code": exc.status_code}},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("unhandled_error", error=str(exc), exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": {"message": "Internal server error", "code": 500}},
        )

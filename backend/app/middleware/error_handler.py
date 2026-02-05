"""Global exception handler middleware."""

import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.exceptions import VoxaException


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app."""

    @app.exception_handler(VoxaException)
    async def voxa_exception_handler(
        request: Request, exc: VoxaException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

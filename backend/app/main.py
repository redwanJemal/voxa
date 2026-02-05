"""Voxa — FastAPI application factory."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import v1_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.middleware.error_handler import register_exception_handlers
from app.middleware.request_id import RequestIdMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown events."""
    setup_logging()
    yield


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI Voice Agent Platform",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )
    _add_middleware(application)
    _include_routers(application)
    register_exception_handlers(application)
    return application


def _add_middleware(application: FastAPI) -> None:
    """Register all middleware."""
    application.add_middleware(RequestIdMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def _include_routers(application: FastAPI) -> None:
    """Include API routers."""
    application.include_router(v1_router, prefix="/api/v1")

    @application.get("/api/v1/health")
    async def health_check() -> dict[str, str]:
        return {"status": "healthy", "version": settings.APP_VERSION}

    @application.get("/health")
    async def root_health() -> dict[str, str]:
        return {"status": "healthy", "version": settings.APP_VERSION}


app = create_app()

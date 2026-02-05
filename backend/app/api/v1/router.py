"""V1 API router — aggregates all sub-routers."""

from fastapi import APIRouter

from app.api.v1.agents import router as agents_router
from app.api.v1.auth import router as auth_router
from app.api.v1.billing import router as billing_router
from app.api.v1.calls import router as calls_router
from app.api.v1.knowledge_bases import router as kb_router
from app.api.v1.settings import router as settings_router
from app.api.v1.voice_ws import router as voice_ws_router

v1_router = APIRouter()

v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
v1_router.include_router(agents_router, prefix="/agents", tags=["Agents"])
v1_router.include_router(kb_router, tags=["Knowledge Bases"])
v1_router.include_router(calls_router, prefix="/calls", tags=["Calls"])
v1_router.include_router(billing_router, prefix="/billing", tags=["Billing"])
v1_router.include_router(settings_router, prefix="/settings", tags=["Settings"])
v1_router.include_router(voice_ws_router, tags=["Voice"])

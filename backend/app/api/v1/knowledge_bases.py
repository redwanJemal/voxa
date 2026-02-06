"""Knowledge base endpoints."""

import asyncio
import json
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_org_id
from app.core.database import get_db
from app.rag.retriever import search as rag_search
from app.schemas.common import MessageResponse
from app.schemas.knowledge_base import (
    DocumentResponse,
    KnowledgeBaseCreate,
    KnowledgeBaseResponse,
    SearchQuery,
    SearchResult,
)
from app.services import knowledge_base_service

logger = structlog.get_logger("kb_api")

router = APIRouter()


@router.get("/agents/{agent_id}/knowledge-bases", response_model=list[KnowledgeBaseResponse])
async def list_knowledge_bases(
    agent_id: UUID,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """List knowledge bases for an agent."""
    return await knowledge_base_service.list_knowledge_bases(agent_id, db)


@router.post(
    "/agents/{agent_id}/knowledge-bases",
    response_model=KnowledgeBaseResponse,
    status_code=201,
)
async def create_knowledge_base(
    agent_id: UUID,
    body: KnowledgeBaseCreate,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new knowledge base for an agent."""
    return await knowledge_base_service.create_knowledge_base(agent_id, body, db)


@router.get("/knowledge-bases/{kb_id}/documents", response_model=list[DocumentResponse])
async def list_documents(
    kb_id: UUID,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """List all documents in a knowledge base."""
    return await knowledge_base_service.list_documents(kb_id, db)


@router.post("/knowledge-bases/{kb_id}/documents", response_model=DocumentResponse, status_code=201)
async def upload_document(
    kb_id: UUID,
    file: UploadFile,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document — returns immediately, processes in background."""
    content = await file.read()
    return await knowledge_base_service.upload_document(
        kb_id,
        file.filename or "untitled",
        file.content_type or "application/octet-stream",
        len(content),
        content,
        db,
    )


@router.get("/knowledge-bases/{kb_id}/events")
async def stream_events(
    kb_id: UUID,
    request: Request,
    token: str = Query(default=""),
):
    """SSE endpoint — streams real-time document processing events."""
    # Auth via query param (EventSource can't set headers)
    # We accept the JWT token as a query parameter for SSE
    if token:
        from app.core.security import verify_token
        try:
            verify_token(token)
        except Exception:
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Invalid token")

    async def event_generator():
        import redis.asyncio as redis
        from app.core.config import settings

        client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = client.pubsub()
        channel = f"kb:{kb_id}:events"
        await pubsub.subscribe(channel)

        try:
            # Send initial keepalive
            yield f"event: connected\ndata: {json.dumps({'kb_id': str(kb_id)})}\n\n"

            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break

                message = await pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=1.0
                )
                if message and message["type"] == "message":
                    data = message["data"]
                    try:
                        parsed = json.loads(data)
                        event_type = parsed.pop("type", "update")
                    except (json.JSONDecodeError, AttributeError):
                        event_type = "update"
                        parsed = {"raw": data}

                    yield f"event: {event_type}\ndata: {json.dumps(parsed, default=str)}\n\n"
                else:
                    # Send keepalive every ~15s of silence
                    yield ": keepalive\n\n"
                    await asyncio.sleep(1)

        except asyncio.CancelledError:
            pass
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
            await client.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/knowledge-bases/{kb_id}/documents/{doc_id}/retry", response_model=DocumentResponse)
async def retry_document(
    kb_id: UUID,
    doc_id: UUID,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Retry processing a failed document."""
    return await knowledge_base_service.retry_document(kb_id, doc_id, db)


@router.delete("/knowledge-bases/{kb_id}/documents/{doc_id}", response_model=MessageResponse)
async def delete_document(
    kb_id: UUID,
    doc_id: UUID,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document from a knowledge base."""
    await knowledge_base_service.delete_document(kb_id, doc_id, db)
    return MessageResponse(message="Document deleted")


@router.post("/knowledge-bases/{kb_id}/search", response_model=list[SearchResult])
async def search_knowledge_base(
    kb_id: UUID,
    body: SearchQuery,
    org_id: UUID = Depends(get_current_org_id),
):
    """Search a knowledge base."""
    collection_name = f"kb_{kb_id}"
    try:
        results = await rag_search(collection_name, body.query, body.top_k)
        return [
            SearchResult(
                content=r["content"],
                score=r["score"],
                document_id=r["document_id"],
                metadata=r.get("metadata", {}),
            )
            for r in results
        ]
    except Exception as exc:
        logger.warning("search_failed", kb_id=str(kb_id), error=str(exc))
        return []

"""Knowledge base service — upload, process, embed."""

import asyncio
import json
from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import async_session_factory
from app.core.exceptions import NotFoundException
from app.models.agent import Agent
from app.models.knowledge_base import Document, DocumentStatus, KnowledgeBase
from app.rag.processor import process_document
from app.schemas.knowledge_base import (
    DocumentResponse,
    KnowledgeBaseCreate,
    KnowledgeBaseResponse,
)
from app.services import provider_key_service, storage_service

logger = structlog.get_logger("kb_service")


# ---------------------------------------------------------------------------
# Redis pub/sub helpers for SSE
# ---------------------------------------------------------------------------

async def _publish_event(kb_id: str, event_type: str, data: dict) -> None:
    """Publish a document processing event to Redis pub/sub."""
    from app.core.cache import get_redis

    client = await get_redis()
    channel = f"kb:{kb_id}:events"
    payload = json.dumps({"type": event_type, **data}, default=str)
    await client.publish(channel, payload)


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

async def list_knowledge_bases(agent_id: UUID, db: AsyncSession) -> list[KnowledgeBaseResponse]:
    """List all knowledge bases for an agent."""
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.agent_id == agent_id)
    )
    return [KnowledgeBaseResponse.model_validate(kb) for kb in result.scalars().all()]


async def create_knowledge_base(
    agent_id: UUID, data: KnowledgeBaseCreate, db: AsyncSession
) -> KnowledgeBaseResponse:
    """Create a new knowledge base."""
    kb = KnowledgeBase(agent_id=agent_id, **data.model_dump())
    db.add(kb)
    await db.flush()
    logger.info("kb_created", kb_id=str(kb.id), agent_id=str(agent_id))
    return KnowledgeBaseResponse.model_validate(kb)


async def upload_document(
    kb_id: UUID,
    filename: str,
    content_type: str,
    size_bytes: int,
    content: bytes,
    db: AsyncSession,
) -> DocumentResponse:
    """Save metadata + S3, return immediately, process in background."""
    kb = await _get_kb_or_raise(kb_id, db)
    
    # Get organization ID for API key lookup
    agent = await db.get(Agent, kb.agent_id)
    org_id_str = str(agent.organization_id) if agent else None

    doc = Document(
        knowledge_base_id=kb.id,
        filename=filename,
        content_type=content_type,
        size_bytes=size_bytes,
        status=DocumentStatus.PENDING,
    )
    db.add(doc)
    await db.flush()

    doc_id_str = str(doc.id)
    kb_id_str = str(kb_id)
    storage_key = f"kb_{kb_id_str}/{doc_id_str}/{filename}"
    doc.storage_path = storage_key

    # Upload to S3 (fast, do it inline so we don't lose the bytes)
    try:
        await storage_service.upload_file(content, storage_key, content_type)
        logger.info("document_uploaded_s3", doc_id=doc_id_str, key=storage_key)
    except Exception as exc:
        doc.status = DocumentStatus.FAILED
        doc.error_message = f"S3 upload failed: {exc}"
        await db.flush()
        await _publish_event(kb_id_str, "doc:failed", {
            "doc_id": doc_id_str, "filename": filename,
            "error": doc.error_message,
        })
        return DocumentResponse.model_validate(doc)

    # Update KB doc count right away
    kb.total_documents += 1
    kb.size_bytes += size_bytes
    await db.flush()

    response = DocumentResponse.model_validate(doc)

    # Fire background processing (new DB session, new event loop task)
    asyncio.create_task(
        _process_document_background(kb_id_str, doc_id_str, filename, content_type, content, org_id_str)
    )

    return response


async def _process_document_background(
    kb_id: str, doc_id: str, filename: str, content_type: str, content: bytes, org_id: str | None
) -> None:
    """Process a document in the background with its own DB session."""
    try:
        # Publish "processing" event
        await _publish_event(kb_id, "doc:processing", {
            "doc_id": doc_id, "filename": filename,
        })

        async with async_session_factory() as db:
            doc = await db.get(Document, doc_id)
            if not doc:
                logger.error("bg_process_doc_not_found", doc_id=doc_id)
                return

            doc.status = DocumentStatus.PROCESSING
            await db.commit()

            # Fetch OpenAI key from organization's provider keys
            openai_key = None
            if org_id:
                from uuid import UUID
                openai_key = await provider_key_service.get_key(UUID(org_id), "openai", db)
            
            if not openai_key:
                logger.warning("no_openai_key_for_embeddings", org_id=org_id)

            try:
                collection_name = f"kb_{kb_id}"
                chunk_count = await process_document(
                    doc_id=doc_id,
                    content=content,
                    content_type=content_type,
                    collection_name=collection_name,
                    openai_key=openai_key,
                )

                doc.status = DocumentStatus.COMPLETED
                doc.chunk_count = chunk_count
                await db.commit()

                # Update KB chunk totals
                kb = await db.get(KnowledgeBase, kb_id)
                if kb:
                    kb.total_chunks += chunk_count
                    await db.commit()

                logger.info("bg_document_processed", doc_id=doc_id, chunks=chunk_count)
                await _publish_event(kb_id, "doc:completed", {
                    "doc_id": doc_id, "filename": filename,
                    "chunk_count": chunk_count,
                })

            except Exception as exc:
                logger.error("bg_document_failed", doc_id=doc_id, error=str(exc))
                doc.status = DocumentStatus.FAILED
                doc.error_message = str(exc)[:1000]
                await db.commit()

                await _publish_event(kb_id, "doc:failed", {
                    "doc_id": doc_id, "filename": filename,
                    "error": str(exc)[:500],
                })

    except Exception as exc:
        logger.error("bg_process_fatal", doc_id=doc_id, error=str(exc))


async def list_documents(kb_id: UUID, db: AsyncSession) -> list[DocumentResponse]:
    """List all documents in a knowledge base."""
    await _get_kb_or_raise(kb_id, db)
    result = await db.execute(
        select(Document)
        .where(Document.knowledge_base_id == kb_id)
        .order_by(Document.created_at.desc())
    )
    return [DocumentResponse.model_validate(doc) for doc in result.scalars().all()]


async def delete_document(kb_id: UUID, doc_id: UUID, db: AsyncSession) -> None:
    """Delete a document from a knowledge base."""
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.knowledge_base_id == kb_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise NotFoundException("Document", str(doc_id))

    if doc.storage_path:
        await storage_service.delete_file(doc.storage_path)

    kb = await _get_kb_or_raise(kb_id, db)
    kb.total_documents = max(0, kb.total_documents - 1)
    kb.total_chunks = max(0, kb.total_chunks - doc.chunk_count)
    kb.size_bytes = max(0, kb.size_bytes - doc.size_bytes)
    await db.delete(doc)
    await db.flush()

    await _publish_event(str(kb_id), "doc:deleted", {"doc_id": str(doc_id)})
    logger.info("document_deleted", doc_id=str(doc_id))


async def _get_kb_or_raise(kb_id: UUID, db: AsyncSession) -> KnowledgeBase:
    """Get knowledge base by ID or raise."""
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb:
        raise NotFoundException("KnowledgeBase", str(kb_id))
    return kb

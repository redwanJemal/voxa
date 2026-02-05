"""Knowledge base service — upload, process, embed."""

from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.knowledge_base import Document, DocumentStatus, KnowledgeBase
from app.schemas.knowledge_base import (
    DocumentResponse,
    KnowledgeBaseCreate,
    KnowledgeBaseResponse,
)

logger = structlog.get_logger("kb_service")


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
    kb_id: UUID, filename: str, content_type: str, size_bytes: int, db: AsyncSession
) -> DocumentResponse:
    """Register a document upload and queue processing."""
    kb = await _get_kb_or_raise(kb_id, db)
    doc = Document(
        knowledge_base_id=kb.id,
        filename=filename,
        content_type=content_type,
        size_bytes=size_bytes,
        status=DocumentStatus.PENDING,
    )
    db.add(doc)
    kb.total_documents += 1
    kb.size_bytes += size_bytes
    await db.flush()
    logger.info("document_uploaded", doc_id=str(doc.id), filename=filename)
    return DocumentResponse.model_validate(doc)


async def delete_document(kb_id: UUID, doc_id: UUID, db: AsyncSession) -> None:
    """Delete a document from a knowledge base."""
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.knowledge_base_id == kb_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise NotFoundException("Document", str(doc_id))

    kb = await _get_kb_or_raise(kb_id, db)
    kb.total_documents = max(0, kb.total_documents - 1)
    kb.size_bytes = max(0, kb.size_bytes - doc.size_bytes)
    await db.delete(doc)
    await db.flush()
    logger.info("document_deleted", doc_id=str(doc_id))


async def _get_kb_or_raise(kb_id: UUID, db: AsyncSession) -> KnowledgeBase:
    """Get knowledge base by ID or raise."""
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb:
        raise NotFoundException("KnowledgeBase", str(kb_id))
    return kb

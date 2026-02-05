"""Knowledge base service — upload, process, embed."""

from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundException
from app.models.knowledge_base import Document, DocumentStatus, KnowledgeBase
from app.rag.processor import process_document
from app.schemas.knowledge_base import (
    DocumentResponse,
    KnowledgeBaseCreate,
    KnowledgeBaseResponse,
)
from app.services import storage_service

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
    kb_id: UUID,
    filename: str,
    content_type: str,
    size_bytes: int,
    content: bytes,
    db: AsyncSession,
) -> DocumentResponse:
    """Upload a document to S3, process it, and store in vector DB."""
    kb = await _get_kb_or_raise(kb_id, db)

    # Create document record
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
    storage_key = f"kb_{kb_id}/{doc_id_str}/{filename}"

    try:
        # Upload to S3
        doc.status = DocumentStatus.PROCESSING
        doc.storage_path = storage_key
        await db.flush()

        await storage_service.upload_file(content, storage_key, content_type)
        logger.info("document_uploaded_s3", doc_id=doc_id_str, key=storage_key)

        # Process document: extract text, chunk, embed, store in Qdrant
        collection_name = f"kb_{kb_id}"
        chunk_count = await process_document(
            doc_id=doc_id_str,
            content=content,
            content_type=content_type,
            collection_name=collection_name,
        )

        # Update document as completed
        doc.status = DocumentStatus.COMPLETED
        doc.chunk_count = chunk_count

        # Update KB totals
        kb.total_documents += 1
        kb.total_chunks += chunk_count
        kb.size_bytes += size_bytes
        await db.flush()

        logger.info(
            "document_processed",
            doc_id=doc_id_str,
            chunks=chunk_count,
            filename=filename,
        )

    except Exception as exc:
        logger.error("document_processing_failed", doc_id=doc_id_str, error=str(exc))
        doc.status = DocumentStatus.FAILED
        doc.error_message = str(exc)[:1000]
        await db.flush()

    return DocumentResponse.model_validate(doc)


async def list_documents(kb_id: UUID, db: AsyncSession) -> list[DocumentResponse]:
    """List all documents in a knowledge base."""
    # Verify KB exists
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

    # Delete from S3 if stored
    if doc.storage_path:
        await storage_service.delete_file(doc.storage_path)

    kb = await _get_kb_or_raise(kb_id, db)
    kb.total_documents = max(0, kb.total_documents - 1)
    kb.total_chunks = max(0, kb.total_chunks - doc.chunk_count)
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

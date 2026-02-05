"""Knowledge base endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_org_id
from app.core.database import get_db
from app.schemas.common import MessageResponse
from app.schemas.knowledge_base import (
    DocumentResponse,
    KnowledgeBaseCreate,
    KnowledgeBaseResponse,
    SearchQuery,
    SearchResult,
)
from app.services import knowledge_base_service

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


@router.post("/knowledge-bases/{kb_id}/documents", response_model=DocumentResponse, status_code=201)
async def upload_document(
    kb_id: UUID,
    file: UploadFile,
    org_id: UUID = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document to a knowledge base."""
    content = await file.read()
    return await knowledge_base_service.upload_document(
        kb_id, file.filename or "untitled", file.content_type or "application/octet-stream",
        len(content), db
    )


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
    """Search a knowledge base (test endpoint)."""
    return []

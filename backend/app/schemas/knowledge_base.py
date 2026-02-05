"""Knowledge base and document schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.knowledge_base import DocumentStatus


class KnowledgeBaseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class KnowledgeBaseResponse(BaseModel):
    id: UUID
    agent_id: UUID
    name: str
    description: str | None
    total_documents: int
    total_chunks: int
    size_bytes: int
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentResponse(BaseModel):
    id: UUID
    knowledge_base_id: UUID
    filename: str
    content_type: str
    size_bytes: int
    chunk_count: int
    status: DocumentStatus
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchQuery(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)


class SearchResult(BaseModel):
    content: str
    score: float
    document_id: str
    metadata: dict

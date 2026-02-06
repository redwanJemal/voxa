"""Qdrant-based hybrid retriever for RAG."""

import uuid

import structlog
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.core.config import settings
from app.rag.embeddings import EMBEDDING_DIMENSIONS, generate_embedding

logger = structlog.get_logger("retriever")

_qdrant_client: AsyncQdrantClient | None = None


async def get_qdrant() -> AsyncQdrantClient:
    """Get or create Qdrant client."""
    global _qdrant_client
    if _qdrant_client is None:
        kwargs: dict = {"url": settings.QDRANT_URL}
        if settings.QDRANT_API_KEY:
            kwargs["api_key"] = settings.QDRANT_API_KEY
        _qdrant_client = AsyncQdrantClient(**kwargs)
    return _qdrant_client


async def ensure_collection(collection_name: str) -> None:
    """Create collection if it doesn't exist."""
    client = await get_qdrant()
    collections = await client.get_collections()
    names = [c.name for c in collections.collections]
    if collection_name not in names:
        await client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=EMBEDDING_DIMENSIONS, distance=Distance.COSINE),
        )
        logger.info("collection_created", name=collection_name)


def _chunk_id(doc_id: str, chunk_index: int) -> str:
    """Generate a deterministic UUID for a chunk based on doc_id and index."""
    # Use uuid5 with a namespace to create deterministic, valid UUIDs
    namespace = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # URL namespace
    return str(uuid.uuid5(namespace, f"{doc_id}:{chunk_index}"))


async def upsert_chunks(
    collection_name: str, chunks: list[str], embeddings: list[list[float]],
    doc_id: str, metadata: dict | None = None,
) -> int:
    """Upsert text chunks with their embeddings into Qdrant."""
    client = await get_qdrant()
    points = [
        PointStruct(
            id=_chunk_id(doc_id, i),
            vector=embedding,
            payload={"content": chunk, "document_id": doc_id, "chunk_index": i, **(metadata or {})},
        )
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]
    await client.upsert(collection_name=collection_name, points=points)
    return len(points)


async def search(collection_name: str, query: str, top_k: int = 5) -> list[dict]:
    """Search collection using dense vector similarity."""
    client = await get_qdrant()
    
    # Ensure collection exists before searching
    await ensure_collection(collection_name)
    
    query_embedding = await generate_embedding(query)
    # Qdrant SDK v1.16+ uses query_points instead of search
    results = await client.query_points(
        collection_name=collection_name,
        query=query_embedding,
        limit=top_k,
        with_payload=True,
    )
    return [
        {"content": r.payload.get("content", ""), "score": r.score,
         "document_id": r.payload.get("document_id", ""), "metadata": r.payload}
        for r in results.points
    ]

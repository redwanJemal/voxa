"""Document processing pipeline for RAG."""

import structlog

from app.rag.chunker import chunk_text
from app.rag.embeddings import generate_embeddings
from app.rag.retriever import ensure_collection, upsert_chunks

logger = structlog.get_logger("processor")

SUPPORTED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/markdown": "md",
}


async def process_document(
    doc_id: str, content: bytes, content_type: str, collection_name: str,
    openai_key: str | None = None
) -> int:
    """Process a document: extract text, chunk, embed, and store."""
    file_type = SUPPORTED_TYPES.get(content_type, "txt")
    text = _extract_text(content, file_type)
    if not text.strip():
        logger.warning("empty_document", doc_id=doc_id)
        return 0

    chunks = chunk_text(text)
    embeddings = await generate_embeddings(chunks, api_key=openai_key)
    await ensure_collection(collection_name)
    count = await upsert_chunks(collection_name, chunks, embeddings, doc_id)
    logger.info("document_processed", doc_id=doc_id, chunks=count)
    return count


def _extract_text(content: bytes, file_type: str) -> str:
    """Extract text from document bytes based on type."""
    if file_type in ("txt", "md"):
        return content.decode("utf-8", errors="replace")
    if file_type == "pdf":
        return _extract_pdf_text(content)
    if file_type == "docx":
        return _extract_docx_text(content)
    return content.decode("utf-8", errors="replace")


def _extract_pdf_text(content: bytes) -> str:
    """Extract text from PDF. Requires PyPDF2 or similar."""
    try:
        import io
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except ImportError:
        logger.warning("pypdf not installed, treating PDF as raw text")
        return content.decode("utf-8", errors="replace")


def _extract_docx_text(content: bytes) -> str:
    """Extract text from DOCX. Requires python-docx."""
    try:
        import io
        import docx
        doc = docx.Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)
    except ImportError:
        logger.warning("python-docx not installed, treating DOCX as raw text")
        return content.decode("utf-8", errors="replace")

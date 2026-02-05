"""Semantic text chunking for RAG pipeline."""

import re

DEFAULT_CHUNK_SIZE = 400
DEFAULT_OVERLAP = 50
MAX_CHUNK_SIZE = 600


def chunk_text(text: str, chunk_size: int = DEFAULT_CHUNK_SIZE, overlap: int = DEFAULT_OVERLAP) -> list[str]:
    """Split text into overlapping chunks at sentence boundaries."""
    sentences = _split_sentences(text)
    if not sentences:
        return []

    chunks: list[str] = []
    current_chunk: list[str] = []
    current_length = 0

    for sentence in sentences:
        sentence_len = len(sentence.split())
        if current_length + sentence_len > chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            overlap_text = _get_overlap_sentences(current_chunk, overlap)
            current_chunk = overlap_text
            current_length = sum(len(s.split()) for s in current_chunk)

        current_chunk.append(sentence)
        current_length += sentence_len

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences using regex."""
    text = text.strip()
    if not text:
        return []
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


def _get_overlap_sentences(sentences: list[str], target_words: int) -> list[str]:
    """Get trailing sentences for overlap."""
    result: list[str] = []
    word_count = 0
    for sentence in reversed(sentences):
        words = len(sentence.split())
        if word_count + words > target_words and result:
            break
        result.insert(0, sentence)
        word_count += words
    return result

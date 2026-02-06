"""Speech-to-Text service using Deepgram."""

from typing import AsyncGenerator

import structlog

from app.core.config import settings

logger = structlog.get_logger("stt")


class STTService:
    """Deepgram Speech-to-Text service."""

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.DEEPGRAM_API_KEY

    async def transcribe(self, audio_data: bytes, language: str = "en") -> str:
        """Transcribe audio bytes to text."""
        from deepgram import DeepgramClient

        client = DeepgramClient(api_key=self.api_key)
        # SDK v5+ uses direct parameters instead of PrerecordedOptions
        response = client.listen.v1.media.transcribe_file(
            request=audio_data,
            model="nova-2",
            language=language,
            smart_format=True,
        )
        transcript = response.results.channels[0].alternatives[0].transcript
        logger.info("transcription_complete", length=len(transcript))
        return transcript

    async def stream_transcribe(
        self, audio_stream: AsyncGenerator[bytes, None], language: str = "en"
    ) -> AsyncGenerator[str, None]:
        """Stream transcription from audio chunks."""
        buffer = b""
        async for chunk in audio_stream:
            buffer += chunk
            if len(buffer) >= 16000:
                text = await self.transcribe(buffer, language)
                if text:
                    yield text
                buffer = b""
        if buffer:
            text = await self.transcribe(buffer, language)
            if text:
                yield text

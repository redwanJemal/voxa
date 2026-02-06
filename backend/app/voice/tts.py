"""Text-to-Speech service using Deepgram."""

import structlog

from app.core.config import settings

logger = structlog.get_logger("tts")


class TTSService:
    """Deepgram Text-to-Speech service."""

    def __init__(self, voice: str = "aura-asteria-en", api_key: str | None = None) -> None:
        self.api_key = api_key or settings.DEEPGRAM_API_KEY
        self.voice = voice

    async def synthesize(self, text: str) -> bytes:
        """Convert text to speech audio bytes."""
        from deepgram import DeepgramClient

        client = DeepgramClient(api_key=self.api_key)
        # SDK v5+ uses direct parameters instead of SpeakOptions
        audio_data = b""
        for chunk in client.speak.v1.audio.generate(text=text, model=self.voice):
            audio_data += chunk
        logger.info("tts_complete", text_length=len(text), audio_bytes=len(audio_data))
        return audio_data

    async def synthesize_stream(self, text: str):
        """Stream TTS audio chunks."""
        from deepgram import DeepgramClient

        client = DeepgramClient(api_key=self.api_key)
        # SDK v5+ returns an iterator directly
        for chunk in client.speak.v1.audio.generate(text=text, model=self.voice):
            yield chunk

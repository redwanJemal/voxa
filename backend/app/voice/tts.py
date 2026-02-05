"""Text-to-Speech service using Deepgram."""

import structlog

from app.core.config import settings

logger = structlog.get_logger("tts")


class TTSService:
    """Deepgram Text-to-Speech service."""

    def __init__(self, voice: str = "aura-asteria-en") -> None:
        self.api_key = settings.DEEPGRAM_API_KEY
        self.voice = voice

    async def synthesize(self, text: str) -> bytes:
        """Convert text to speech audio bytes."""
        from deepgram import DeepgramClient, SpeakOptions

        client = DeepgramClient(self.api_key)
        options = SpeakOptions(model=self.voice)
        response = await client.speak.asyncrest.v("1").stream_raw(
            {"text": text}, options
        )
        audio_data = b""
        async for chunk in response.stream:
            audio_data += chunk
        logger.info("tts_complete", text_length=len(text), audio_bytes=len(audio_data))
        return audio_data

    async def synthesize_stream(self, text: str):
        """Stream TTS audio chunks."""
        from deepgram import DeepgramClient, SpeakOptions

        client = DeepgramClient(self.api_key)
        options = SpeakOptions(model=self.voice)
        response = await client.speak.asyncrest.v("1").stream_raw(
            {"text": text}, options
        )
        async for chunk in response.stream:
            yield chunk

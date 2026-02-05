"""Voice pipeline orchestrator — coordinates STT, LLM, TTS."""

import structlog

from app.rag.retriever import search
from app.voice.llm import ConversationHandler
from app.voice.stt import STTService
from app.voice.tts import TTSService

logger = structlog.get_logger("voice_pipeline")


class VoicePipeline:
    """Orchestrates the full voice conversation pipeline."""

    def __init__(
        self,
        model: str,
        system_prompt: str,
        voice: str = "aura-asteria-en",
        language: str = "en",
        collection_name: str | None = None,
        provider: str = "openai",
        api_keys: dict[str, str] | None = None,
    ) -> None:
        keys = api_keys or {}
        self.stt = STTService(api_key=keys.get("deepgram"))
        self.llm = ConversationHandler(
            model=model,
            system_prompt=system_prompt,
            provider=provider,
            api_key=keys.get(provider),
        )
        self.tts = TTSService(voice=voice, api_key=keys.get("deepgram"))
        self.language = language
        self.collection_name = collection_name

    async def process_audio(self, audio_data: bytes) -> tuple[str, str, bytes]:
        """Process audio input → text → LLM → audio output.

        Returns (user_text, agent_text, audio_response).
        """
        user_text = await self.stt.transcribe(audio_data, self.language)
        logger.info("user_said", text=user_text[:100])

        if self.collection_name:
            response_text = await self._respond_with_rag(user_text)
        else:
            response_text = await self.llm.respond(user_text)

        logger.info("agent_said", text=response_text[:100])
        audio_response = await self.tts.synthesize(response_text)
        return user_text, response_text, audio_response

    async def process_text(self, user_text: str) -> tuple[str, bytes]:
        """Process text input → LLM → audio output.

        Returns (agent_text, audio_response).
        """
        if self.collection_name:
            response_text = await self._respond_with_rag(user_text)
        else:
            response_text = await self.llm.respond(user_text)

        audio_response = await self.tts.synthesize(response_text)
        return response_text, audio_response

    async def _respond_with_rag(self, user_text: str) -> str:
        """Get LLM response with RAG context."""
        results = await search(self.collection_name, user_text, top_k=3)
        context = "\n\n".join(r["content"] for r in results)
        return await self.llm.respond_with_context(user_text, context)

    def reset(self) -> None:
        """Reset conversation state."""
        self.llm.reset()

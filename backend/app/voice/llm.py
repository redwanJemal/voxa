"""LLM conversation handler for voice agents."""

import structlog
from openai import AsyncOpenAI

from app.core.config import settings

logger = structlog.get_logger("voice_llm")


class ConversationHandler:
    """Manages LLM conversation for a voice agent."""

    def __init__(self, model: str, system_prompt: str) -> None:
        self.model = model
        self.system_prompt = system_prompt
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]

    async def respond(self, user_input: str) -> str:
        """Generate a response to user input."""
        self.messages.append({"role": "user", "content": user_input})
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=self.messages,
            max_tokens=500,
            temperature=0.7,
        )
        assistant_msg = response.choices[0].message.content or ""
        self.messages.append({"role": "assistant", "content": assistant_msg})
        logger.info("llm_response", model=self.model, input_len=len(user_input))
        return assistant_msg

    async def respond_with_context(self, user_input: str, context: str) -> str:
        """Generate a response with RAG context injected."""
        augmented = f"Context:\n{context}\n\nUser: {user_input}"
        return await self.respond(augmented)

    def reset(self) -> None:
        """Reset conversation history."""
        self.messages = [{"role": "system", "content": self.system_prompt}]

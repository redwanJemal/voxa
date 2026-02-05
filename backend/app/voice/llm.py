"""LLM conversation handler for voice agents — multi-provider via litellm."""

import structlog
import litellm

logger = structlog.get_logger("voice_llm")

# Provider prefix mapping for litellm
PROVIDER_PREFIX = {
    "openai": "openai",
    "google": "gemini",
    "anthropic": "anthropic",
    "groq": "groq",
    "deepseek": "deepseek",
}


def _litellm_model(provider: str, model: str) -> str:
    """Build the litellm model string, e.g. 'openai/gpt-4o-mini'."""
    prefix = PROVIDER_PREFIX.get(provider, provider)
    return f"{prefix}/{model}"


class ConversationHandler:
    """Manages LLM conversation for a voice agent."""

    def __init__(
        self,
        model: str,
        system_prompt: str,
        provider: str = "openai",
        api_key: str | None = None,
    ) -> None:
        self.provider = provider
        self.model = model
        self.litellm_model = _litellm_model(provider, model)
        self.system_prompt = system_prompt
        self.api_key = api_key
        self.messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]

    async def respond(self, user_input: str) -> str:
        """Generate a response to user input."""
        self.messages.append({"role": "user", "content": user_input})

        kwargs: dict = {
            "model": self.litellm_model,
            "messages": self.messages,
            "max_tokens": 500,
            "temperature": 0.7,
        }
        if self.api_key:
            kwargs["api_key"] = self.api_key

        response = await litellm.acompletion(**kwargs)
        assistant_msg = response.choices[0].message.content or ""
        self.messages.append({"role": "assistant", "content": assistant_msg})
        logger.info("llm_response", model=self.litellm_model, input_len=len(user_input))
        return assistant_msg

    async def respond_with_context(self, user_input: str, context: str) -> str:
        """Generate a response with RAG context injected."""
        augmented = f"Context:\n{context}\n\nUser: {user_input}"
        return await self.respond(augmented)

    def reset(self) -> None:
        """Reset conversation history."""
        self.messages = [{"role": "system", "content": self.system_prompt}]

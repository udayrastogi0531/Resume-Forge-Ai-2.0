import httpx

from app.core.config import get_settings
from app.providers.base import AIProvider, AIResponse, AIProviderError

settings = get_settings()

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqProvider(AIProvider):
    """Free/low-cost primary provider. Uses Groq's OpenAI-compatible chat
    completions endpoint. Model is configured via GROQ_MODEL env var so it
    can be updated as Groq's available models change, instead of being
    hardcoded to a model that may later be deprecated."""

    name = "groq"

    def is_configured(self) -> bool:
        return bool(settings.GROQ_API_KEY)

    def complete(self, system_prompt: str, user_prompt: str, *, json_mode: bool = False) -> AIResponse:
        if not self.is_configured():
            raise AIProviderError("Your Groq API key is missing.", kind="auth")

        payload = {
            "model": settings.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            with httpx.Client(timeout=settings.AI_REQUEST_TIMEOUT_SECONDS) as client:
                resp = client.post(
                    GROQ_URL,
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
        except httpx.TimeoutException:
            raise AIProviderError("AI provider is temporarily unavailable (timeout).", kind="timeout")
        except httpx.RequestError:
            raise AIProviderError("AI provider is temporarily unavailable (network error).", kind="network")

        if resp.status_code == 401:
            raise AIProviderError("Your Groq API key is invalid.", kind="auth")
        if resp.status_code == 429:
            raise AIProviderError("Groq rate limit or quota exceeded. Please try again shortly.", kind="rate_limit")
        if resp.status_code >= 500:
            raise AIProviderError("AI provider is temporarily unavailable.", kind="unavailable")
        if resp.status_code >= 400:
            raise AIProviderError(f"AI provider rejected the request ({resp.status_code}).", kind="invalid_response")

        try:
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, ValueError):
            raise AIProviderError("AI provider returned a malformed response.", kind="invalid_response")

        return AIResponse(text=content, provider=self.name, model=settings.GROQ_MODEL)

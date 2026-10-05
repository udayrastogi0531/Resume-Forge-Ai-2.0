import httpx

from app.core.config import get_settings
from app.providers.base import AIProvider, AIResponse, AIProviderError

settings = get_settings()


class GeminiProvider(AIProvider):
    name = "gemini"

    def is_configured(self) -> bool:
        return bool(settings.GEMINI_API_KEY)

    def complete(self, system_prompt: str, user_prompt: str, *, json_mode: bool = False) -> AIResponse:
        if not self.is_configured():
            raise AIProviderError("Your Gemini API key is missing.", kind="auth")

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        )
        payload = {
            "contents": [{"parts": [{"text": user_prompt}]}],
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "generationConfig": {"temperature": 0.3, "response_mime_type": "application/json" if json_mode else "text/plain"},
        }
        try:
            with httpx.Client(timeout=settings.AI_REQUEST_TIMEOUT_SECONDS) as client:
                resp = client.post(url, json=payload)
        except httpx.TimeoutException:
            raise AIProviderError("Gemini is temporarily unavailable (timeout).", kind="timeout")
        except httpx.RequestError:
            raise AIProviderError("Gemini is temporarily unavailable (network error).", kind="network")

        if resp.status_code == 401 or resp.status_code == 403:
            raise AIProviderError("Your Gemini API key is invalid.", kind="auth")
        if resp.status_code == 429:
            raise AIProviderError("Gemini rate limit exceeded.", kind="rate_limit")
        if resp.status_code >= 400:
            raise AIProviderError(f"Gemini rejected the request ({resp.status_code}).", kind="invalid_response")

        try:
            data = resp.json()
            content = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, ValueError):
            raise AIProviderError("Gemini returned a malformed response.", kind="invalid_response")

        return AIResponse(text=content, provider=self.name, model=settings.GEMINI_MODEL)


class OpenRouterProvider(AIProvider):
    name = "openrouter"

    def is_configured(self) -> bool:
        return bool(settings.OPENROUTER_API_KEY)

    def complete(self, system_prompt: str, user_prompt: str, *, json_mode: bool = False) -> AIResponse:
        if not self.is_configured():
            raise AIProviderError("Your OpenRouter API key is missing.", kind="auth")

        payload = {
            "model": settings.OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
        }
        try:
            with httpx.Client(timeout=settings.AI_REQUEST_TIMEOUT_SECONDS) as client:
                resp = client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"},
                    json=payload,
                )
        except httpx.TimeoutException:
            raise AIProviderError("OpenRouter is temporarily unavailable (timeout).", kind="timeout")
        except httpx.RequestError:
            raise AIProviderError("OpenRouter is temporarily unavailable (network error).", kind="network")

        if resp.status_code == 401:
            raise AIProviderError("Your OpenRouter API key is invalid.", kind="auth")
        if resp.status_code == 429:
            raise AIProviderError("OpenRouter rate limit exceeded.", kind="rate_limit")
        if resp.status_code >= 400:
            raise AIProviderError(f"OpenRouter rejected the request ({resp.status_code}).", kind="invalid_response")

        try:
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, ValueError):
            raise AIProviderError("OpenRouter returned a malformed response.", kind="invalid_response")

        return AIResponse(text=content, provider=self.name, model=settings.OPENROUTER_MODEL)

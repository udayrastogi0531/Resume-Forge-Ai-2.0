from app.core.config import get_settings
from app.providers.base import AIProvider, AIProviderError
from app.providers.groq_provider import GroqProvider
from app.providers.other_providers import GeminiProvider, OpenRouterProvider
from app.providers.mock_provider import MockProvider

settings = get_settings()

_PROVIDERS: dict[str, AIProvider] = {
    "groq": GroqProvider(),
    "gemini": GeminiProvider(),
    "openrouter": OpenRouterProvider(),
    "mock": MockProvider(),
}


def get_provider(name: str | None = None) -> AIProvider:
    key = (name or settings.AI_PROVIDER or "mock").lower()
    return _PROVIDERS.get(key, _PROVIDERS["mock"])


def complete_with_fallback(system_prompt: str, user_prompt: str, *, json_mode: bool = True):
    """Runs the configured primary provider; falls back to the next
    configured provider ONLY if AI_FALLBACK_ENABLED is set, since silently
    switching providers can affect user expectations (e.g. data handling
    differences between providers)."""
    primary = get_provider()
    try:
        return primary.complete(system_prompt, user_prompt, json_mode=json_mode)
    except AIProviderError as e:
        if not settings.AI_FALLBACK_ENABLED:
            raise
        for name, provider in _PROVIDERS.items():
            if provider is primary or not provider.is_configured():
                continue
            try:
                return provider.complete(system_prompt, user_prompt, json_mode=json_mode)
            except AIProviderError:
                continue
        raise e

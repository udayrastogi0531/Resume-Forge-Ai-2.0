from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class AIResponse:
    text: str
    provider: str
    model: str


class AIProviderError(Exception):
    """Raised for any provider failure: timeout, bad key, rate limit, etc.
    Always caught by the caller and turned into a user-friendly message —
    never surfaced as a raw stack trace."""
    def __init__(self, message: str, kind: str = "unknown"):
        super().__init__(message)
        self.kind = kind  # "timeout" | "auth" | "rate_limit" | "network" | "invalid_response" | "unavailable"


class AIProvider(ABC):
    name: str = "base"

    @abstractmethod
    def complete(self, system_prompt: str, user_prompt: str, *, json_mode: bool = False) -> AIResponse:
        """Send a single-turn completion request. Raises AIProviderError on failure."""
        raise NotImplementedError

    def is_configured(self) -> bool:
        return True

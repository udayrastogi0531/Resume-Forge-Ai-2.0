import json
import re
from typing import Any

from app.providers.factory import complete_with_fallback
from app.providers.base import AIProviderError
from app.prompts.validation import REPAIR_SYSTEM_PROMPT, build_repair_prompt


class AIJsonError(Exception):
    """Raised when the AI response cannot be turned into valid JSON even
    after one repair attempt. Caller must NOT save/apply anything and must
    show an error instead of corrupting the resume."""


def _strip_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    return text


def get_structured_json(system_prompt: str, user_prompt: str, expected_keys: list[str]) -> dict[str, Any]:
    """Calls the AI provider, parses JSON, and validates that all expected
    top-level keys are present. Retries once with a repair prompt on
    failure; raises AIJsonError if it still can't be salvaged."""
    try:
        response = complete_with_fallback(system_prompt, user_prompt, json_mode=True)
    except AIProviderError:
        raise

    raw = _strip_fences(response.text)
    parsed = _try_parse(raw, expected_keys)
    if parsed is not None:
        return parsed

    # Retry once with a repair prompt.
    try:
        repair_response = complete_with_fallback(
            REPAIR_SYSTEM_PROMPT, build_repair_prompt(raw, expected_keys), json_mode=True
        )
    except AIProviderError as e:
        raise AIJsonError(f"AI returned invalid JSON and repair failed: {e}")

    repaired = _try_parse(_strip_fences(repair_response.text), expected_keys)
    if repaired is not None:
        return repaired

    raise AIJsonError("AI response could not be parsed as valid JSON after one repair attempt.")


def _try_parse(text: str, expected_keys: list[str]) -> dict[str, Any] | None:
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    if not all(key in data for key in expected_keys):
        return None
    return data

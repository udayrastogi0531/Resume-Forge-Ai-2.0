PROMPT_VERSION = "1.0.0"

REPAIR_SYSTEM_PROMPT = """You repair malformed JSON. You will be given text
that was supposed to be a single JSON object matching a schema, but failed
to parse. Return ONLY the corrected, valid JSON object. Do not add
commentary, do not wrap it in markdown fences, and do not change any
factual content — only fix syntax (quotes, commas, brackets, escaping).
"""


def build_repair_prompt(broken_text: str, expected_keys: list[str]) -> str:
    return (
        f"Expected JSON keys: {', '.join(expected_keys)}\n\n"
        f"Malformed output:\n{broken_text}\n\n"
        "Return only the corrected JSON object."
    )

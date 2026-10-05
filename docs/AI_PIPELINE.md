# AI pipeline
Prompts live in `app/prompts/*` (versioned, `PROMPT_VERSION`). `services/ai_json.py` calls the provider,
strips code fences, validates required top-level keys, retries once with a repair prompt, else raises.
Tailoring (`routes/tailor.py`): cache lookup (sha256 of resume+JD id) -> AI -> compile check -> re-score.
If the tailored LaTeX fails to compile, the original is returned with a warning and nothing is saved.
Errors map to friendly 502 messages; stack traces are never returned.
`MockProvider` is a rule-based stand-in used for tests/offline dev; it is NOT an LLM.
Note: the cache key uses the JD id, so re-uploading the same JD creates a new key.

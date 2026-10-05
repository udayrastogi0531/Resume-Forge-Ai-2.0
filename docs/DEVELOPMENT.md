# Development
See README for setup. Tables are created via `Base.metadata.create_all` (no Alembic yet).
After changing Python deps, clear stale `__pycache__` if imports behave oddly.

## Limitations (honest list)
- Groq/Gemini/OpenRouter providers are implemented but were never called live (sandbox had no access).
- docker-compose/Dockerfiles were written but not built or run.
- No Alembic migrations; no rate limiting; no Supabase Auth/Storage/Google OAuth; uploads are not persisted to disk (only extracted text).
- LaTeX isolation is process-level only (see LATEX_SECURITY.md).
- ATS score/breakdown columns exist on versions but no endpoint persists them; scores are computed on demand.
- Resume import from .tex/PDF upload UI is not built (paste/edit only). Project rename and Compare-with-arbitrary-version UI are not built (diff is shown in tailoring review).
- Light theme, PDF.js viewer (uses the browser's PDF viewer), cover-letter PDF export, and Vitest unit tests are not built.
- "Tailor" progress steps are a client-side animation over one real request (backend does not stream progress).
- The Playwright E2E is a Python script; PDF pixels were not visually verified (headless Chromium has no PDF viewer).

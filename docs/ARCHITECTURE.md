# ResumeForge AI System Architecture

## Overview

ResumeForge AI 2.0 is structured as a modern monorepo separating client presentation, domain business logic, document compilation, and persistent storage.

```
┌────────────────────────────────────────────────────────┐
│               Frontend: Next.js 16 Web                 │
│  - App Router / React 19 / TypeScript 5                │
│  - Monaco LaTeX Editor & Side-by-side Diff Viewer      │
│  - Zustand State Stores (Auth, Toast, UI Layout)       │
│  - Lucide Icons & Tailwind CSS Design System           │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / JSON API
                            ▼
┌────────────────────────────────────────────────────────┐
│               Backend: FastAPI (Python 3.11)           │
│  - Bearer JWT Auth & Argon2/Bcrypt Security            │
│  - API Routes: /auth, /projects, /ats, /tailor, etc.   │
│  - Deterministic ATS Rules Engine                      │
│  - AI Provider Abstraction (Groq, Gemini, OpenRouter)  │
│  - Pydantic Schema Validation & JSON Repair Service    │
└──────────────┬─────────────────────────┬───────────────┘
               │                         │
               ▼                         ▼
┌─────────────────────────────┐ ┌────────────────────────┐
│     Compilation Sandbox     │ │    Relational Data     │
│  - Temporary Directory Pool │ │  - PostgreSQL (Prod)   │
│  - pdflatex Subprocess      │ │  - SQLite (Local Dev)  │
│  - -no-shell-escape flag    │ │  - SQLAlchemy 2.0 ORM  │
│  - Wall-clock timeout watchdog│ └────────────────────────┘
└─────────────────────────────┘
```

---

## Component Responsibilities

### 1. Presentation Layer (`apps/web`)
- **Route Guarding**: The `(protected)` route group guards dashboard, resume studio, job description, and cover letter routes. Unauthorized requests automatically redirect to `/login`.
- **Monaco LaTeX Editor**: Embeds Monaco locally for zero-latency editing. Syntax highlighting, autosave debounce, and line error annotations.
- **Diff Review Modal**: Uses Monaco DiffEditor to display side-by-side comparisons of original LaTeX versus AI-tailored LaTeX.
- **State Management**: Zustand stores manage active authentication sessions, active project versions, and floating toasts.

### 2. Application Layer (`apps/api`)
- **Route Modularization**:
  - `/api/auth`: User registration, login, and profile introspection.
  - `/api/projects`: Project and version management (branching, duplicating, deleting).
  - `/api/job-descriptions`: PDF/text upload, text extraction, and entity parsing.
  - `/api/resume/compile`: Isolated LaTeX compilation returning base64 PDF and error logs.
  - `/api/resume/analyze`: Deterministic ATS scoring and recommendation breakdown.
  - `/api/resume/tailor`: Guardrailed resume optimization and keyword alignment.
  - `/api/cover-letters`: Contextual cover letter creation linked to resumes and job specs.

### 3. LaTeX Compilation Subsystem (`apps/api/app/compiler`)
- Each compilation job is allocated an isolated temporary directory.
- `pdflatex` executes with flags `-no-shell-escape`, `-interaction=nonstopmode`, and `-halt-on-error`.
- Subprocesses are monitored by a wall-clock watchdog (default 25s) to prevent infinite loops from malicious LaTeX macros.
- Standard output and error logs are parsed with regular expressions to extract line numbers and error diagnostics.

### 4. Deterministic ATS Engine (`apps/api/app/ats`)
- Operates independently of AI models to guarantee deterministic, reproducible evaluations.
- Analyses text for:
  - Skill and alias occurrences.
  - Required vs. optional skill coverage ratios.
  - Complex table usage, nested multi-column environments, and image macros that degrade parser readability.
  - Content length and keyword density checks.

# ResumeForge AI 2.0

[![CI](https://github.com/udayrastogi0531/Resume-Forge-Ai-2.0/actions/workflows/ci.yml/badge.svg)](https://github.com/udayrastogi0531/Resume-Forge-Ai-2.0/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

> **A professional, AI-powered LaTeX resume engineering workspace:** Edit real LaTeX with a high-performance Monaco editor, compile directly to native PDF via isolated `pdflatex`, ingest job descriptions to receive deterministic ATS scoring, and execute truth-preserving AI tailoring that enhances your real achievements without ever fabricating skills, metrics, or experience.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Workflow Pipeline](#workflow-pipeline)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development (Without Docker)](#local-development-without-docker)
  - [Docker Compose Setup](#docker-compose-setup)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [Verification & Testing](#verification--testing)
- [Production Deployment Guide](#production-deployment-guide)
  - [Frontend (Vercel)](#frontend-vercel)
  - [Backend (Docker / Render / Fly.io)](#backend-docker--render--flyio)
  - [Database (PostgreSQL)](#database-postgresql)
- [Truthfulness & Security Model](#truthfulness--security-model)
- [Roadmap](#roadmap)
- [Known Limitations](#known-limitations)
- [Author & License](#author--license)

---

## Overview

Most "AI resume builders" output rigid Markdown templates or basic HTML documents that fail automated applicant tracking systems (ATS) or look generic. 

**ResumeForge AI 2.0** bridges developer-grade typography with algorithmic job alignment:
- **Real LaTeX Under the Hood**: Direct access to `.tex` source code compiled into production-quality PDFs.
- **Deterministic ATS Auditing**: Exact rule-based scoring (0–100) analyzing keyword frequency, section density, formatting risks (tables, multi-column macros), and skill coverage.
- **Strict Anti-Fabrication Rule**: Tailoring rewrites and highlights only what is already present in your background. Unmet job requirements are flagged as missing keywords for your awareness, never hallucinated into your experience.
- **Side-by-Side Monaco Diff Review**: Every tailoring suggestion is presented in a side-by-side diff. Nothing updates without explicit user consent.

---

## Key Features

### 1. Resume Studio
- **Monaco LaTeX Editor**: Full syntax highlighting, error squiggles, and editor controls bundled locally without third-party CDN latency.
- **Native PDF Compilation**: Executes isolated `pdflatex` runs with strict `-no-shell-escape` flags and wall-clock execution timeouts.
- **Live PDF Preview**: Synchronous PDF viewer with zoom controls, fit-width, and fit-page scaling.
- **Version Branching**: Create multiple versions per project (e.g., *Frontend Lead*, *Full Stack*, *Systems Engineer*) with non-destructive version switching.
- **Productivity Shortcuts**: `Ctrl/Cmd + S` (Save), `Ctrl/Cmd + Enter` (Compile), `Ctrl/Cmd + K` (Command Palette), `Ctrl/Cmd + Shift + A` (Run ATS Audit), `Ctrl/Cmd + Shift + T` (Tailor).

### 2. Job Description Intelligence
- **PDF & Text Extraction**: Multi-tier extraction leveraging `pdfplumber` and `PyMuPDF` with fallback handling.
- **Entity Extraction**: Automatically parses role title, company name, required skills, preferred qualifications, and key responsibilities.
- **Persistent Analysis**: Extracted requirements are stored and linked with resume versions to track alignment over time.

### 3. Deterministic ATS Scoring Engine
- **Algorithmic Evaluation**: Generates a 0–100 compatibility rating computed purely via mathematical rule-sets, not subjective LLM guesses.
- **Formatting Audits**: Warns about parser-breaking LaTeX constructs (unsupported tables, embedded bitmap artifacts, multi-column geometry).
- **Keyword & Skill Matching**: Quantifies required vs. preferred skill coverage, aliases, and occurrences.

### 4. Guardrailed AI Tailoring
- **Zero Fabrication**: Explicit system prompts instruct models to reorder and strengthen existing bullet points while strictly barring the invention of jobs, dates, degrees, or skills.
- **Compile Verification Gate**: AI outputs must compile cleanly via `pdflatex`. If compilation fails, the output is discarded and the original remains unchanged.
- **Structured JSON Validation**: Provider outputs are validated against strict Pydantic schemas with automatic schema repair retries.
- **Side-by-Side Diff Inspector**: Visual diff editor displaying exact additions and removals before creating a new version.

### 5. Document Suite & Cover Letters
- **Contextual Cover Letter Generator**: Generates targeted, professional cover letters referencing specific requirements from the active job description and achievements from the resume.
- **Export & Portability**: Download compiled `.pdf` artifacts or full source `.tex` bundles with one click.

---

## System Architecture

```mermaid
flowchart TB
    subgraph Client["Frontend Layer (Next.js 16 App Router)"]
        UI[Tailwind CSS & React 19 UI]
        Editor[Monaco LaTeX & Diff Editor]
        PDFViewer[PDF Preview Pane]
        State[Zustand Stores & React Query]
    end

    subgraph API["Backend Layer (FastAPI 0.115)"]
        Router[FastAPI Route Handlers]
        Auth[JWT Authentication & Bcrypt]
        ATSEngine[Deterministic ATS Engine]
        JSONService[AI JSON Validation & Repair]
    end

    subgraph Compiler["LaTeX Compilation Sandbox"]
        TempDir[Isolated Per-Request Temp Directory]
        PDFLatex[pdflatex Process Tree\n-no-shell-escape, timeout]
    end

    subgraph Storage["Data Persistence"]
        DB[(PostgreSQL / SQLite)]
        LocalStorage[(File Storage / Artifacts)]
    end

    subgraph Providers["AI Provider Layer"]
        Groq[Groq API\nPrimary Provider]
        Gemini[Google Gemini API\nOptional Fallback]
        OpenRouter[OpenRouter API\nOptional Fallback]
        Mock[Offline Rule Mock\nTesting & Local Dev]
    end

    UI --> Router
    Editor --> Router
    Router --> Auth
    Router --> ATSEngine
    Router --> JSONService
    Router --> TempDir
    TempDir --> PDFLatex
    PDFLatex --> PDFViewer
    Router --> DB
    Router --> LocalStorage
    JSONService --> Groq
    JSONService --> Gemini
    JSONService --> OpenRouter
    JSONService --> Mock
```

---

## Workflow Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User as Engineer / Candidate
    participant Web as Next.js Web App
    participant API as FastAPI Backend
    participant ATS as ATS Rules Engine
    participant LLM as AI Provider (Groq)
    participant TeX as pdflatex Compiler

    User->>Web: Input or Upload LaTeX Resume
    Web->>API: POST /api/resume/compile
    API->>TeX: Run pdflatex (-no-shell-escape)
    TeX-->>API: Return PDF bytes & compilation log
    API-->>Web: Render PDF preview in Monaco pane

    User->>Web: Upload Target Job Description (PDF/Text)
    Web->>API: POST /api/jd/upload
    API-->>Web: Parsed JD Entities (Skills, Requirements)

    User->>Web: Request ATS Compatibility Analysis
    Web->>API: POST /api/ats/analyze
    API->>ATS: Compute deterministic match & format checks
    ATS-->>Web: Score (0-100), Keyword breakdown, Warnings

    User->>Web: Request AI Tailoring
    Web->>API: POST /api/resume/tailor
    API->>LLM: Send Resume + JD with strict anti-fabrication prompt
    LLM-->>API: Structured JSON (tailored_latex, changes, missing_skills)
    API->>TeX: Validate compilation of new LaTeX
    TeX-->>API: Compilation Confirmed
    API-->>Web: Return Tailored Draft

    Web->>User: Display Side-by-Side Monaco Diff
    User->>Web: Confirm "Apply as New Version"
    Web->>API: POST /api/projects/{id}/versions
    API-->>Web: Version saved, new PDF compiled and rendered
```

---

## Tech Stack

| Domain | Technology | Details |
|---|---|---|
| **Frontend Framework** | [Next.js 16](https://nextjs.org/) | App Router, Server/Client components, Turbopack |
| **Frontend Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict type checking throughout client codebase |
| **Styling & Icons** | [Tailwind CSS 4](https://tailwindcss.com/) / [Lucide](https://lucide.dev/) | Responsive dark UI, sleek typography, iconography |
| **Code & Diff Editor** | [Monaco Editor](https://microsoft.github.io/monaco-editor/) | Embedded locally (`@monaco-editor/react`), side-by-side diffing |
| **Client State** | [Zustand](https://github.com/pmndrs/zustand) / [React Query](https://tanstack.com/query) | Lightweight state stores and cached server queries |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) | High-performance Python 3.11 asynchronous web framework |
| **Database ORM** | [SQLAlchemy 2.0](https://www.sqlalchemy.org/) | Relational modeling with SQLite (dev) and PostgreSQL (prod) |
| **Security & Auth** | Passlib / PyJWT / Bcrypt | Secure salted password hashing, JWT bearer tokens |
| **Document Processing** | `pdfplumber` / `PyMuPDF` | Text extraction, layout parsing, and document inspection |
| **PDF Compilation** | `pdflatex` (TeX Live) | Secure subprocess execution (`-no-shell-escape`, wall-clock timeout) |
| **AI Providers** | [Groq](https://groq.com/) / [Gemini](https://ai.google.dev/) / OpenRouter | Modular provider abstraction with offline Mock fallback |
| **Containerization** | [Docker](https://www.docker.com/) / Docker Compose | Multi-stage Dockerfiles with TeX Live dependencies pre-installed |

---

## Project Structure

```
Resume-Forge-Ai-2.0/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Automated CI: backend tests & frontend build
├── apps/
│   ├── api/                       # FastAPI Backend Application
│   │   ├── app/
│   │   │   ├── api/               # API endpoints & dependency injection
│   │   │   │   ├── routes/        # auth, projects, ats, tailor, compile, etc.
│   │   │   │   └── deps.py        # Database sessions & current user auth
│   │   │   ├── ats/               # Deterministic ATS scoring engine
│   │   │   ├── compiler/          # Isolated pdflatex compiler service
│   │   │   ├── core/              # Config, DB connection, security routines
│   │   │   ├── models/            # SQLAlchemy database models
│   │   │   ├── parsers/           # PDF text & structure extraction
│   │   │   ├── prompts/           # Guardrailed LLM prompts (zero fabrication)
│   │   │   ├── providers/         # AI providers: Groq, Gemini, OpenRouter, Mock
│   │   │   ├── schemas/           # Pydantic validation schemas
│   │   │   └── services/          # AI JSON parsing & repair logic
│   │   ├── tests/                 # Backend automated test suite (pytest)
│   │   ├── Dockerfile             # Debian + TeX Live + Python container
│   │   ├── requirements.txt       # Python dependencies
│   │   └── .env.example           # Backend environment template
│   └── web/                       # Next.js 16 Frontend Application
│       ├── app/                   # App Router pages and layouts
│       │   ├── (protected)/       # Authenticated routes (dashboard, editor, jd)
│       │   ├── login/ & signup/   # Authentication views
│       │   └── globals.css        # Core styles and design tokens
│       ├── components/            # UI components (LatexEditor, ATSPanel, Diff)
│       ├── lib/                   # API clients, authStore, resume templates
│       ├── e2e/                   # End-to-end browser automation scripts
│       ├── Dockerfile             # Production Node.js container
│       ├── package.json           # Frontend dependencies & scripts
│       └── .env.example           # Frontend environment template
├── docs/                          # Comprehensive Technical Documentation
│   ├── AI_PIPELINE.md             # AI prompt engineering & validation details
│   ├── ARCHITECTURE.md            # In-depth architectural specifications
│   ├── ATS_ENGINE.md              # Deterministic scoring algorithm details
│   ├── DEPLOYMENT.md              # Cloud deployment instructions
│   ├── DEVELOPMENT.md             # Local development workflows
│   └── LATEX_SECURITY.md          # Subprocess sandboxing & security review
├── docker-compose.yml             # Local multi-container orchestration
├── .gitignore                     # Comprehensive git ignore rules
├── LICENSE                        # MIT License
└── README.md                      # Flagship project documentation
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.x` or `v22.x`+ (`v24.x` compatible)
- **Python**: `3.11` or `3.12`
- **TeX Live** (for local compilation outside Docker):
  - **Ubuntu / Debian**: `sudo apt install texlive-latex-base texlive-fonts-recommended texlive-latex-extra`
  - **macOS**: `brew install --cask mactex-no-gui`
  - **Windows**: Install [MiKTeX](https://miktex.org/) or [TeX Live](https://tug.org/texlive/) and ensure `pdflatex` is added to your system `PATH`.

---

### Local Development (Without Docker)

#### 1. Start the Backend API
```bash
cd apps/api

# Create and activate virtual environment
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell:
# .\.venv\Scripts\Activate.ps1

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Configure environment (Mock provider requires zero API keys)
cp .env.example .env

# Run FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

#### 2. Start the Frontend Application
```bash
cd apps/web

# Install packages
npm ci

# Configure environment
cp .env.example .env.local

# Run Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Docker Compose Setup

Run the entire stack with zero host dependencies (LaTeX, Python, and Node are bundled in containers):

```bash
# Clone the repository
git clone https://github.com/udayrastogi0531/Resume-Forge-Ai-2.0.git
cd Resume-Forge-Ai-2.0

# Copy root environment file
cp .env.example .env

# Build and start services
docker-compose up --build
```
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000](http://localhost:8000)

---

## Configuration & Environment Variables

All sensitive values must be configured via environment variables. **Never commit actual secrets to version control.**

### Backend (`apps/api/.env`)

| Variable | Description | Default |
|---|---|---|
| `ENV` | Environment mode (`development`, `production`, `test`) | `development` |
| `DEBUG` | Enable verbose logging | `true` |
| `JWT_SECRET` | Secret key used for signing JWT tokens | *Required in production* |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Expiration time for access tokens | `10080` (7 days) |
| `DATABASE_URL` | SQLAlchemy connection string (SQLite or PostgreSQL) | `sqlite:///./resumeforge.db` |
| `AI_PROVIDER` | Active provider: `groq`, `gemini`, `openrouter`, `mock` | `groq` |
| `GROQ_API_KEY` | API key for Groq Cloud | `your_groq_api_key_here` |
| `GROQ_MODEL` | Groq model identifier | `openai/gpt-oss-120b` |
| `LATEX_COMPILER` | Binary path or command for compilation | `pdflatex` |
| `LATEX_COMPILE_TIMEOUT_SECONDS`| Maximum seconds allowed per compile | `25` |
| `CORS_ORIGINS` | Comma-separated allowed CORS origins | `http://localhost:3000` |

### Frontend (`apps/web/.env.local`)

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL pointing to the running FastAPI backend | `http://localhost:8000` |

---

## Verification & Testing

ResumeForge AI 2.0 maintains strict quality checks across both services:

### Backend Test Suite (Pytest)
```bash
cd apps/api
pytest tests/ -v
```
- Tests cover user registration, authentication guards, multi-tenant project isolation, version history branches, deterministic ATS scoring calculations, alias normalization, and AI JSON contract error-recovery.

### Frontend Validation (Lint & Build)
```bash
cd apps/web
# Run ESLint validation
npm run lint

# Run Next.js production build
npm run build
```
- Turbopack builds all static and dynamic routes cleanly with zero TypeScript errors.

---

## Production Deployment Guide

### Frontend (Vercel)
1. Import the repository into [Vercel](https://vercel.com/).
2. Set the **Root Directory** to `apps/web`.
3. In **Environment Variables**, define:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-domain.com
   ```
4. Deploy. Vercel automatically detects Next.js and builds the application.

### Backend (Docker / Render / Fly.io / AWS ECS)
> **CRITICAL REQUIREMENT**: The backend requires a native `pdflatex` binary. Platforms that support custom Docker containers (e.g., Render Web Service with Docker, Fly.io, Railway, or AWS ECS/Fargate) are required. Standard serverless functions (like AWS Lambda without custom layers) cannot execute `pdflatex` reliably.

1. Deploy the backend using the provided `apps/api/Dockerfile`, which extends a Debian base and installs `texlive-latex-base` and `texlive-fonts-recommended`.
2. Configure production environment variables on your host:
   ```
   ENV=production
   DEBUG=false
   JWT_SECRET=<generate-a-secure-random-64-char-string>
   DATABASE_URL=postgresql+psycopg2://user:password@pg-host:5432/resumeforge
   AI_PROVIDER=groq
   GROQ_API_KEY=<your-production-groq-key>
   CORS_ORIGINS=https://your-vercel-domain.vercel.app
   ```

### Database (PostgreSQL)
- Use any managed PostgreSQL instance (Supabase, Neon, AWS RDS, Render Postgres).
- Point `DATABASE_URL` to your PostgreSQL connection string. SQLAlchemy automatically initializes the schema tables on startup.

For complete deployment architectures, consult [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Truthfulness & Security Model

### Anti-Hallucination Guarantees
1. **Contract-Enforced Prompting**: Prompts strictly command the AI to never create qualifications. Missing skills requested by the JD are isolated into a `missing_keywords` list rather than inserted into the resume.
2. **Deterministic Independent Auditing**: ATS scores are calculated by the algorithmic rules engine in Python, never by the LLM. 
3. **Compilation Safety Gate**: A tailored resume must successfully compile via `pdflatex`. If syntax fails, the output is rejected.
4. **Explicit Diff Approval**: Users inspect all modifications in Monaco DiffEditor prior to creating a new version.

### LaTeX Subprocess Sandboxing
- Compilations execute with `-no-shell-escape`, disabling LaTeX macro execution of shell commands.
- Runs inside isolated temporary directories deleted immediately after compilation.
- Subprocesses execute with non-zero exit handlers and a 25-second wall-clock termination watchdog.
- More details in [`docs/LATEX_SECURITY.md`](docs/LATEX_SECURITY.md).

---

## Roadmap

- [ ] **Multi-engine Compilation**: Support for `xelatex` and `lualatex` for custom TTF/OTF font rendering.
- [ ] **Contextual AI Chat**: In-editor AI assistant for targeted bullet point polishing and phrasing feedback.
- [ ] **Extended Template Library**: Additional battle-tested, ATS-friendly LaTeX templates (Jake's Resume, Deedy, ModernCV).
- [ ] **OAuth2 Social Sign-In**: Integration with GitHub and Google OAuth.
- [ ] **Cgroups Container Sandboxing**: Kernel-level namespace isolation for public multi-tenant compilation nodes.

---

## Known Limitations

- **LaTeX Compiler Host Dependency**: Compilation requires `pdflatex` on the host machine or running via the Docker container.
- **Process-Level Isolation**: Current sandboxing operates at the process and filesystem permission level (`-no-shell-escape`, temp directory isolation). Multi-tenant public deployments should utilize Docker/gVisor boundaries.
- **Browser-Native PDF Viewing**: PDF zoom and fit-width rely on the client browser's built-in PDF rendering engine.

---

## Author & License

**ResumeForge AI 2.0** is authored and maintained by:

**Uday Prakash Rastogi**  
GitHub: [@udayrastogi0531](https://github.com/udayrastogi0531)  
Repository: [udayrastogi0531/Resume-Forge-Ai-2.0](https://github.com/udayrastogi0531/Resume-Forge-Ai-2.0)

Released under the **MIT License**. See [`LICENSE`](LICENSE) for complete details.

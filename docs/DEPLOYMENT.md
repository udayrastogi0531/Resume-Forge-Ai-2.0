# Production Deployment Guide

ResumeForge AI 2.0 consists of a Next.js 16 frontend, a FastAPI asynchronous backend, and a PostgreSQL database.

---

## Architectural Requirements

### Critical LaTeX Requirement
The FastAPI backend compiles raw LaTeX documents using `pdflatex`. Therefore:
- The backend host **must** have TeX Live installed (`texlive-latex-base` and `texlive-fonts-recommended` at minimum).
- Serverless platforms that cannot execute native Linux binaries or do not support custom Docker containers (e.g. standard Vercel functions, Netlify functions, or AWS Lambda without container images) **cannot** host the backend compiler.
- Recommended hosts: **Render Web Service (Docker)**, **Fly.io**, **Railway**, **AWS ECS/Fargate**, or a dedicated Linux VPS.

---

## 1. Frontend Deployment (Vercel)

The Next.js 16 frontend is optimized for edge rendering and static page delivery on Vercel.

### Steps:
1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `next build`
   - **Output Directory**: `.next`
3. Add Environment Variable:
   ```env
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```
4. Click **Deploy**.

---

## 2. Backend Deployment (Docker on Render / Fly.io / Railway)

The backend provides a production-ready `Dockerfile` in `apps/api/Dockerfile` based on Debian with Python 3.11 and TeX Live pre-installed.

### Deploying on Render:
1. Create a **New Web Service** from your GitHub repo.
2. Select **Docker** environment.
3. Set **Docker Context** to `apps/api` and **Dockerfile Path** to `apps/api/Dockerfile`.
4. Configure required Environment Variables:
   ```env
   ENV=production
   DEBUG=false
   JWT_SECRET=<generate_a_random_32+_char_string>
   ACCESS_TOKEN_EXPIRE_MINUTES=10080
   DATABASE_URL=postgresql+psycopg2://<pg_user>:<pg_password>@<pg_host>:5432/<pg_db>
   AI_PROVIDER=groq
   GROQ_API_KEY=<your_production_groq_api_key>
   GROQ_MODEL=openai/gpt-oss-120b
   LATEX_COMPILER=pdflatex
   LATEX_COMPILE_TIMEOUT_SECONDS=25
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```
5. Deploy the service.

### Deploying on Fly.io:
```bash
cd apps/api
fly launch --dockerfile Dockerfile
fly secrets set JWT_SECRET="..." GROQ_API_KEY="..." DATABASE_URL="..."
fly deploy
```

---

## 3. Database Setup (PostgreSQL)

Use any managed PostgreSQL provider (e.g., Supabase, Neon, AWS RDS, Render Postgres):
1. Provision a PostgreSQL 14+ database instance.
2. Obtain the connection URI in the format:
   `postgresql+psycopg2://user:password@host:5432/dbname`
3. Provide this URI as `DATABASE_URL` in the backend environment.
4. On startup, FastAPI calls `Base.metadata.create_all()` to ensure all required tables (`users`, `resume_projects`, `resume_versions`, `job_descriptions`, `cover_letters`, `analysis_cache`, `compile_jobs`) are initialized.

---

## 4. Production Checklist

- [ ] `JWT_SECRET` is set to a cryptographically strong, unique random secret.
- [ ] `CORS_ORIGINS` is restricted to the exact production frontend domain.
- [ ] AI API keys are never exposed in frontend code or client bundles.
- [ ] The backend runs behind an HTTPS proxy / SSL certificate.
- [ ] Host memory is at least 1GB to support concurrent `pdflatex` processes.

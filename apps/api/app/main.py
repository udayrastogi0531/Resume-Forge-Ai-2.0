import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.db import Base, engine
from app.api.routes import auth, projects, job_descriptions, compile as compile_route, ats, tailor, cover_letters, dashboard

settings = get_settings()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("resumeforge")

# Create tables (SQLite dev convenience). Use Alembic migrations in production.
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start = time.time()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("[%s] Unhandled error on %s %s", request_id, request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error."})
    duration_ms = int((time.time() - start) * 1000)
    logger.info("[%s] %s %s -> %s (%dms)", request_id, request.method, request.url.path, response.status_code, duration_ms)
    return response


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME, "ai_provider": settings.AI_PROVIDER}


app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(job_descriptions.router)
app.include_router(compile_route.router)
app.include_router(ats.router)
app.include_router(tailor.router)
app.include_router(cover_letters.router)
app.include_router(dashboard.router)

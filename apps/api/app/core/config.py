"""
Application configuration.

All secrets/config come from environment variables. Never hardcode keys here.
Loaded via pydantic-settings from a `.env` file at the repo root of apps/api.
"""
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    APP_NAME: str = "ResumeForge AI"
    ENV: str = "development"
    DEBUG: bool = True

    # --- Auth ---
    JWT_SECRET: str = "change-this-in-production-please"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # --- Database ---
    # Defaults to local SQLite for zero-config dev. Set DATABASE_URL to a
    # postgres:// URL in production.
    DATABASE_URL: str = "sqlite:///./resumeforge.db"

    # --- AI Providers ---
    AI_PROVIDER: str = "mock"  # "groq" | "gemini" | "openrouter" | "mock"
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: str = "meta-llama/llama-3.3-70b-instruct"
    AI_FALLBACK_ENABLED: bool = False
    AI_REQUEST_TIMEOUT_SECONDS: int = 60

    # --- Storage ---
    STORAGE_ROOT: str = "./storage"
    MAX_UPLOAD_MB: int = 10

    # --- LaTeX compilation ---
    LATEX_COMPILER: str = "pdflatex"  # "pdflatex" | "tectonic"
    LATEX_COMPILE_TIMEOUT_SECONDS: int = 25

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()

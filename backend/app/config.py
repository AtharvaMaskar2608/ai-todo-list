from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root .env, resolved from this file so it loads regardless of the process
# working directory (uvicorn runs with CWD=backend/, but .env lives at the root).
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    """Application configuration sourced from environment / .env."""

    DATABASE_URL: str = "sqlite:///./todo.db"
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://0.0.0.0:5173",
        "http://localhost:3000",
    ]
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-6"

    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://mantis:mantis@localhost:5432/mantis"
    redis_url: str = "redis://localhost:6379"

    # Uploads and finished renders live here; api and worker mount the same volume.
    media_dir: Path = Path("/data/media")
    # Base URL the browser uses to reach the API (image links are built from it).
    public_api_url: str = "http://localhost:8000"
    cors_origins: list[str] = ["http://localhost:3000"]
    max_upload_mb: int = 5

    anthropic_api_key: str = ""
    claude_model: str = "claude-opus-5-5"

    fal_key: str = ""
    fal_model: str = "fal-ai/flux-pro/kontext"
    fal_timeout_s: int = 300

    render_max_tries: int = 3


settings = Settings()

from pathlib import Path
from uuid import uuid4

from .config import settings

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def save_media(data: bytes, suffix: str) -> str:
    name = f"{uuid4().hex}{suffix}"
    (settings.media_dir / name).write_bytes(data)
    return name


def media_path(name: str) -> Path:
    return settings.media_dir / name


def media_url(name: str) -> str:
    return f"{settings.public_api_url}/media/{name}"

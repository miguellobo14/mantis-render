"""fal.ai's step in the pipeline: reference image + prompt -> photorealistic render."""

from pathlib import Path

import fal_client
import httpx

from .config import settings
from .errors import PermanentError


async def render_image(client: fal_client.AsyncClient, image_path: Path, prompt: str) -> bytes:
    if not settings.fal_key:
        raise PermanentError("Falta FAL_KEY: añade tu clave de fal.ai al archivo .env.")

    try:
        image_url = await client.upload_file(image_path)
        result = await client.subscribe(
            settings.fal_model,
            arguments={"prompt": prompt, "image_url": image_url, "output_format": "jpeg"},
            client_timeout=settings.fal_timeout_s,
        )
    except fal_client.FalClientHTTPError as e:
        # fal_client already retried 408/409/429 and gateway errors.
        if e.status_code < 500 and e.status_code not in (408, 409, 429):
            raise PermanentError(f"fal.ai rechazó la petición ({e.status_code}): {e.message}") from e
        raise

    images = result.get("images") or []
    if not images:
        raise PermanentError("fal.ai no devolvió ninguna imagen.")

    # fal's URLs expire, so keep our own copy.
    async with httpx.AsyncClient(timeout=60) as http:
        response = await http.get(images[0]["url"])
        response.raise_for_status()
        return response.content

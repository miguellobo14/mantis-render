"""fal.ai's step in the pipeline: every image-model call goes through here.

- render_images: reference image + prompt -> 1 to 4 photorealistic versions (FLUX Kontext, or
  Kontext multi when there is a style reference)
- edit_image: one version + instruction -> edited image (Kontext, or FLUX Fill with a mask)
- upscale_image: one version -> the same image at 4K (SeedVR)
"""

from pathlib import Path
from typing import Any

import fal_client
import httpx

from .config import settings
from .errors import PermanentError


async def _run(client: fal_client.AsyncClient, model: str, arguments: dict[str, Any]) -> list[bytes]:
    if not settings.fal_key:
        raise PermanentError("Falta FAL_KEY: añade tu clave de fal.ai al archivo .env.")

    try:
        result = await client.subscribe(
            model, arguments=arguments, client_timeout=settings.fal_timeout_s
        )
    except fal_client.FalClientHTTPError as e:
        # fal_client already retried 408/409/429 and gateway errors.
        if e.status_code < 500 and e.status_code not in (408, 409, 429):
            raise PermanentError(f"fal.ai rechazó la petición ({e.status_code}): {e.message}") from e
        raise

    # Generators answer with a list of images, the upscaler with a single one.
    images = result.get("images") or ([result["image"]] if result.get("image") else [])
    if not images:
        raise PermanentError("fal.ai no devolvió ninguna imagen.")

    # fal's URLs expire, so keep our own copies.
    async with httpx.AsyncClient(timeout=60) as http:
        files = []
        for image in images:
            response = await http.get(image["url"])
            response.raise_for_status()
            files.append(response.content)
        return files


async def _upload(client: fal_client.AsyncClient, path: Path) -> str:
    try:
        return await client.upload_file(path)
    except fal_client.FalClientHTTPError as e:
        if e.status_code < 500 and e.status_code not in (408, 409, 429):
            raise PermanentError(f"fal.ai rechazó la imagen ({e.status_code}): {e.message}") from e
        raise


async def render_images(
    client: fal_client.AsyncClient,
    image_path: Path,
    prompt: str,
    count: int = 1,
    reference_path: Path | None = None,
) -> list[bytes]:
    arguments: dict[str, Any] = {"prompt": prompt, "num_images": count, "output_format": "jpeg"}
    if reference_path is None:
        arguments["image_url"] = await _upload(client, image_path)
        return await _run(client, settings.fal_model, arguments)
    arguments["image_urls"] = [await _upload(client, image_path), await _upload(client, reference_path)]
    return await _run(client, settings.fal_multi_model, arguments)


async def edit_image(
    client: fal_client.AsyncClient, image_path: Path, prompt: str, mask_path: Path | None = None
) -> bytes:
    arguments: dict[str, Any] = {
        "prompt": prompt,
        "image_url": await _upload(client, image_path),
        "output_format": "jpeg",
    }
    if mask_path is None:
        return (await _run(client, settings.fal_model, arguments))[0]
    arguments["mask_url"] = await _upload(client, mask_path)
    return (await _run(client, settings.fal_fill_model, arguments))[0]


async def upscale_image(client: fal_client.AsyncClient, image_path: Path) -> bytes:
    arguments = {
        "image_url": await _upload(client, image_path),
        "upscale_mode": "target",
        "target_resolution": "2160p",
        "output_format": "jpg",
    }
    return (await _run(client, settings.fal_upscale_model, arguments))[0]

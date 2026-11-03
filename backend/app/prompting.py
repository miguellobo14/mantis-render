"""Claude's step in the pipeline: turn the client's brief + reference image into a render prompt."""

import base64
import json
from dataclasses import dataclass
from pathlib import Path

import anthropic

from .config import settings
from .errors import PermanentError

SYSTEM_PROMPT = """\
You write instructions for FLUX Kontext, an image-editing model that turns a reference image of \
an interior or a building (usually a SketchUp view, a 3D viewport capture, a hand sketch or a \
photo) into a photorealistic architectural render.

You receive the reference image and the client's brief. Briefs are short, informal and often in \
Spanish, e.g. "cocina moderna, madera clara, luz de tarde".

Write `prompt` in English as one direct editing instruction of 60-120 words that:
- asks to turn the image into a photorealistic architectural render;
- says to keep the exact geometry, layout, camera angle and proportions of the reference. The \
model restyles the space; it does not redesign it;
- names the materials, colors, lighting (time of day, light direction, color temperature) and \
furnishing details the brief asks for, tied to the surfaces you can see in the image ("the \
island countertop", "the back wall");
- fills in whatever the brief leaves open with choices consistent with its style, never \
contradicting it;
- ends with photographic qualities: lens feel, realistic global illumination, natural shadows.

Do not add people, text, logos or objects that are not in the reference unless the brief asks \
for them.

Write `notes` in the language of the brief: one or two sentences telling the client how you \
interpreted the request, including any assumption you made."""

OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "prompt": {"type": "string", "description": "English instruction for the image model."},
        "notes": {"type": "string", "description": "Short note for the client, in the brief's language."},
    },
    "required": ["prompt", "notes"],
    "additionalProperties": False,
}

MEDIA_TYPES = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}


@dataclass
class RenderPrompt:
    prompt: str
    notes: str


async def write_render_prompt(
    client: anthropic.AsyncAnthropic, image_path: Path, brief: str
) -> RenderPrompt:
    if not settings.anthropic_api_key:
        raise PermanentError("Falta ANTHROPIC_API_KEY: añade tu clave de la Claude API al archivo .env.")

    image_data = base64.standard_b64encode(image_path.read_bytes()).decode("utf-8")
    try:
        response = await client.beta.messages.create(
            model=settings.claude_model,
            max_tokens=16000,
            # If a safety classifier declines, the API retries on Anthropic's recommended fallback model.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            # Rewriting a brief is a light task; structured output guarantees parseable JSON.
            output_config={
                "effort": "low",
                "format": {"type": "json_schema", "schema": OUTPUT_SCHEMA},
            },
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": MEDIA_TYPES[image_path.suffix],
                                "data": image_data,
                            },
                        },
                        {"type": "text", "text": f"Client brief: {brief}"},
                    ],
                }
            ],
        )
    except anthropic.APIStatusError as e:
        # The SDK already retried 429/5xx; other 4xx (bad key, invalid request) won't fix themselves.
        if e.status_code < 500 and e.status_code not in (408, 409, 429):
            raise PermanentError(f"Claude rechazó la petición ({e.status_code}): {e.message}") from e
        raise

    if response.stop_reason == "refusal":
        raise PermanentError("Claude no quiso generar un prompt para esta solicitud.")
    if response.stop_reason == "max_tokens":
        raise RuntimeError("Claude se quedó sin tokens antes de terminar el prompt.")

    text = next(block.text for block in response.content if block.type == "text")
    data = json.loads(text)
    return RenderPrompt(prompt=data["prompt"], notes=data["notes"])

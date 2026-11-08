"""Claude's step in the pipeline: turn what the client asked for (plus the image) into a prompt
for the image model.

Two jobs use it: a new render (reference image + brief + mode/style, optionally a style
reference) and an edit of a finished render (render + "cambia solo el piso", optionally limited
to a painted area).
"""

import base64
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import anthropic

from .config import settings
from .errors import PermanentError
from .presets import MODES, STYLES

RENDER_SYSTEM_PROMPT = """\
You write instructions for FLUX Kontext, an image-editing model that turns a reference image of \
an interior or a building (usually a SketchUp view, a 3D viewport capture, a hand sketch or a \
photo) into a photorealistic architectural render.

You receive the reference image, a project mode with rules for this kind of image, sometimes a \
style, and the client's brief. Briefs are short, informal and often in Spanish, e.g. "cocina \
moderna, madera clara, luz de tarde".

Write `prompt` in English as one direct editing instruction of 60-120 words that:
- asks to turn the image into a photorealistic architectural render;
- says to keep the exact geometry, layout, camera angle and proportions of the reference. The \
model restyles the space; it does not redesign it;
- follows the project mode's rules;
- names the materials, colors, lighting (time of day, light direction, color temperature) and \
furnishing details the brief asks for, tied to the surfaces you can see in the image ("the \
island countertop", "the back wall");
- applies the style, if one is given, wherever the brief leaves room; the brief wins on conflicts;
- fills in whatever is still open with choices consistent with the brief, never contradicting it;
- ends with photographic qualities: lens feel, realistic global illumination, natural shadows.

Do not add people, text, logos or objects that are not in the reference unless the brief or the \
project mode asks for them.

Sometimes you also get a second image: a style reference. The image model then receives both \
images, so refer to them as "the first image" (the space to render) and "the second image" (the \
style reference). Ask to match the second image's materials, palette and mood while keeping the \
first image's geometry; never copy the reference's layout or furniture positions.

Write `notes` in the language of the brief: one or two sentences telling the client how you \
interpreted the request, including any assumption you made."""

EDIT_SYSTEM_PROMPT = """\
You write editing instructions for FLUX image models that change one thing in a finished \
architectural render.

You receive the render and the change the client asked for. Requests are short and often in \
Spanish, e.g. "cambia solo el piso por porcelanato gris claro".

If the request says the client painted the area to change, the model will only redraw that \
area. Write `prompt` in English as a 20-60 word description of what must appear inside it: \
materials, colors, pattern and scale, and how it meets the surrounding surfaces and matches the \
existing light and perspective. Describe the content only; do not mention the rest of the image.

Otherwise write `prompt` in English as one direct instruction of 30-80 words for FLUX Kontext: \
name exactly what to change, tied to the visible surface ("the floor", "the left wall", "the \
sofa"), and state that everything else (geometry, camera, other materials, furniture and \
lighting) must stay identical.

Write `notes` in the language of the request: one sentence telling the client what will change."""

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


def _media_type(data: bytes, path: Path) -> str:
    # The API rejects a media type that doesn't match the bytes, and a browser labels a file by
    # its extension, so a PNG renamed to .jpg would fail. Trust the file signature first.
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG"):
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return MEDIA_TYPES[path.suffix]


def _image_block(path: Path) -> dict[str, Any]:
    data = path.read_bytes()
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": _media_type(data, path),
            "data": base64.standard_b64encode(data).decode("utf-8"),
        },
    }


async def _ask_claude(
    client: anthropic.AsyncAnthropic, system: str, content: list[dict[str, Any]]
) -> RenderPrompt:
    if not settings.anthropic_api_key:
        raise PermanentError("Falta ANTHROPIC_API_KEY: añade tu clave de la Claude API al archivo .env.")

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
            system=system,
            messages=[{"role": "user", "content": content}],
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


async def write_render_prompt(
    client: anthropic.AsyncAnthropic,
    image_path: Path,
    brief: str,
    mode: str = "interior",
    style: str | None = None,
    reference_path: Path | None = None,
) -> RenderPrompt:
    content = [_image_block(image_path)]
    if reference_path is not None:
        content.append(_image_block(reference_path))

    lines = [f"Project mode ({MODES[mode].label}): {MODES[mode].hint}"]
    if style:
        lines.append(f"Style ({STYLES[style].label}): {STYLES[style].hint}")
    if reference_path is not None:
        lines.append("The second image is the style reference.")
    lines.append(f"Client brief: {brief}")
    content.append({"type": "text", "text": "\n".join(lines)})
    return await _ask_claude(client, RENDER_SYSTEM_PROMPT, content)


async def write_edit_prompt(
    client: anthropic.AsyncAnthropic, image_path: Path, instruction: str, masked: bool
) -> RenderPrompt:
    area = (
        "The client painted the area to change."
        if masked
        else "No area was painted; the change applies to the whole image."
    )
    content = [
        _image_block(image_path),
        {"type": "text", "text": f"{area}\nRequested change: {instruction}"},
    ]
    return await _ask_claude(client, EDIT_SYSTEM_PROMPT, content)

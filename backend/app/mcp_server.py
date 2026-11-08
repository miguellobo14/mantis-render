"""MCP server: lets Claude (Claude Code, Claude Desktop) order and check renders as tools.

It is a thin client of the HTTP API, so jobs go through the same validation, queue and worker
as the ones created from the web app.

Run with: python -m app.mcp_server   (serves streamable HTTP on :8001/mcp)
"""

import mimetypes
import os
from pathlib import Path
from typing import Any

import httpx
from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError

API_URL = os.environ.get("MANTIS_API_URL", "http://localhost:8000")
INBOX = Path(os.environ.get("MANTIS_INBOX", "/inbox")).resolve()

mcp = MCPServer(
    "mantis-render",
    instructions=(
        "Architectural render pipeline. create_render queues a photorealistic render (1-4 "
        "versions) from a reference image and a short brief; list_presets gives the valid modes "
        "and styles. Once a render is done, edit_render changes one thing in a version and "
        "upscale_render makes a 4K copy of it. Every job takes from seconds to a few minutes, so "
        "poll get_render until status is 'done' or 'failed'."
    ),
)


async def _api(method: str, path: str, **kwargs: Any) -> Any:
    async with httpx.AsyncClient(base_url=API_URL, timeout=60) as http:
        response = await http.request(method, path, **kwargs)
    if response.is_error:
        raise ToolError(f"API error {response.status_code}: {response.text}")
    return response.json()


@mcp.tool()
async def list_presets() -> dict:
    """List the project modes (interior, exterior, obra gris...) and styles create_render accepts."""
    return await _api("GET", "/presets")


@mcp.tool()
async def create_render(
    brief: str,
    image_url: str | None = None,
    inbox_file: str | None = None,
    mode: str = "interior",
    style: str | None = None,
    variants: int = 1,
) -> dict:
    """Queue a photorealistic render of an interior or building.

    Args:
        brief: What the client wants, e.g. "cocina moderna, madera clara, luz de tarde".
        image_url: Public URL of the reference image (JPG, PNG or WebP).
        inbox_file: Alternatively, the name of a file in the project's inbox/ folder.
        mode: Project mode id from list_presets, e.g. "interior", "exterior" or "obra".
        style: Optional style id from list_presets, e.g. "nordico".
        variants: How many versions to generate, 1 to 4 (each one is billed).

    Pass exactly one of image_url or inbox_file. Returns the job; its id is used by get_render.
    """
    if bool(image_url) == bool(inbox_file):
        raise ToolError("Pass exactly one of image_url or inbox_file.")

    if image_url:
        async with httpx.AsyncClient(timeout=60, follow_redirects=True) as http:
            response = await http.get(image_url)
        if response.is_error:
            raise ToolError(f"Could not download {image_url}: HTTP {response.status_code}")
        data = response.content
        content_type = response.headers.get("content-type", "").split(";")[0]
        filename = Path(response.url.path).name or "reference"
    else:
        path = (INBOX / inbox_file).resolve()
        if not path.is_relative_to(INBOX) or not path.is_file():
            raise ToolError(f"{inbox_file!r} is not a file in the inbox folder.")
        data = path.read_bytes()
        content_type = mimetypes.guess_type(path.name)[0] or ""
        filename = path.name

    form = {"brief": brief, "mode": mode, "variants": str(variants)}
    if style:
        form["style"] = style
    return await _api("POST", "/renders", data=form, files={"image": (filename, data, content_type)})


@mcp.tool()
async def edit_render(job_id: str, instruction: str, source_index: int = 0) -> dict:
    """Change one thing in a finished render, e.g. "cambia solo el piso por porcelanato gris".

    Args:
        job_id: A done render or edit job.
        instruction: The change, in the client's words.
        source_index: Which version of that job to edit (0 = first).

    Returns a new edit job; poll it with get_render.
    """
    return await _api(
        "POST",
        f"/renders/{job_id}/edit",
        data={"instruction": instruction, "source_index": str(source_index)},
    )


@mcp.tool()
async def upscale_render(job_id: str, source_index: int = 0) -> dict:
    """Make a 4K copy of one version of a finished render or edit. Returns a new upscale job."""
    return await _api(
        "POST", f"/renders/{job_id}/upscale", data={"source_index": str(source_index)}
    )


@mcp.tool()
async def get_render(job_id: str) -> dict:
    """Get a job: status (queued, processing, done, failed), the prompt Claude wrote for the
    image model, result_urls once it is done, and, for an original render, the edits and
    upscales made from it under `derived`."""
    return await _api("GET", f"/renders/{job_id}")


@mcp.tool()
async def list_renders(limit: int = 10) -> list[dict]:
    """List the most recent render jobs, newest first."""
    return await _api("GET", "/renders", params={"limit": limit})


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=8001)

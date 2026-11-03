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
        "Architectural render pipeline. create_render queues a photorealistic render from a "
        "reference image and a short brief; renders take from seconds to a few minutes, so poll "
        "get_render until status is 'done' or 'failed'."
    ),
)


async def _api(method: str, path: str, **kwargs: Any) -> Any:
    async with httpx.AsyncClient(base_url=API_URL, timeout=60) as http:
        response = await http.request(method, path, **kwargs)
    if response.is_error:
        raise ToolError(f"API error {response.status_code}: {response.text}")
    return response.json()


@mcp.tool()
async def create_render(
    brief: str, image_url: str | None = None, inbox_file: str | None = None
) -> dict:
    """Queue a photorealistic render of an interior or building.

    Args:
        brief: What the client wants, e.g. "cocina moderna, madera clara, luz de tarde".
        image_url: Public URL of the reference image (JPG, PNG or WebP).
        inbox_file: Alternatively, the name of a file in the project's inbox/ folder.

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

    return await _api(
        "POST",
        "/renders",
        data={"brief": brief},
        files={"image": (filename, data, content_type)},
    )


@mcp.tool()
async def get_render(job_id: str) -> dict:
    """Get a render job: status (queued, processing, done, failed), the prompt Claude wrote for
    the image model, and result_url once it is done."""
    return await _api("GET", f"/renders/{job_id}")


@mcp.tool()
async def list_renders(limit: int = 10) -> list[dict]:
    """List the most recent render jobs, newest first."""
    return await _api("GET", "/renders", params={"limit": limit})


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=8001)

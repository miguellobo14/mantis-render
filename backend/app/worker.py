"""ARQ worker: takes queued jobs and runs them through Claude and fal.ai.

Every job kind (render, edit, upscale) goes through the same queue, status updates and retry
rules; only the steps in the middle differ.

Run with: arq app.worker.WorkerSettings
"""

import logging
from collections.abc import Awaitable, Callable

import anthropic
import fal_client
from arq import Retry
from arq.connections import RedisSettings
from arq.worker import func
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import SessionLocal
from .errors import PermanentError
from .models import JobKind, JobStatus, RenderJob
from .prompting import write_edit_prompt, write_render_prompt
from .rendering import edit_image, render_images, upscale_image
from .storage import media_path, save_media

log = logging.getLogger("mantis.worker")


# On a retry, Claude's prompt is reused if it's already saved: only the failed step runs again.

async def _render(ctx: dict, session: AsyncSession, job: RenderJob) -> list[str]:
    image = media_path(job.input_file)
    reference = media_path(job.reference_file) if job.reference_file else None
    if job.render_prompt is None:
        result = await write_render_prompt(
            ctx["claude"], image, job.brief, job.mode, job.style, reference
        )
        job.render_prompt, job.claude_notes = result.prompt, result.notes
        await session.commit()

    images = await render_images(ctx["fal"], image, job.render_prompt, job.variants, reference)
    return [save_media(data, ".jpg") for data in images]


async def _edit(ctx: dict, session: AsyncSession, job: RenderJob) -> list[str]:
    image = media_path(job.input_file)
    mask = media_path(job.mask_file) if job.mask_file else None
    if job.render_prompt is None:
        result = await write_edit_prompt(ctx["claude"], image, job.brief, masked=mask is not None)
        job.render_prompt, job.claude_notes = result.prompt, result.notes
        await session.commit()

    return [save_media(await edit_image(ctx["fal"], image, job.render_prompt, mask), ".jpg")]


async def _upscale(ctx: dict, session: AsyncSession, job: RenderJob) -> list[str]:
    # Nothing to interpret: no Claude step.
    return [save_media(await upscale_image(ctx["fal"], media_path(job.input_file)), ".jpg")]


STEPS: dict[JobKind, Callable[[dict, AsyncSession, RenderJob], Awaitable[list[str]]]] = {
    JobKind.render: _render,
    JobKind.edit: _edit,
    JobKind.upscale: _upscale,
}


async def process_render(ctx: dict, job_id: str) -> str:
    attempt: int = ctx["job_try"]

    async with SessionLocal() as session:
        job = await session.get(RenderJob, job_id)
        if job is None:
            log.warning("job %s not found, skipping", job_id)
            return "missing"

        job.status = JobStatus.processing
        job.attempts = attempt
        job.error = None
        await session.commit()

        try:
            job.result_files = await STEPS[job.kind](ctx, session, job)
            job.status = JobStatus.done

        except PermanentError as e:
            job.status = JobStatus.failed
            job.error = str(e)

        except Exception as e:
            log.exception("job %s failed on attempt %d", job_id, attempt)
            if attempt < settings.render_max_tries:
                job.status = JobStatus.queued
                job.error = f"El intento {attempt} falló ({e}). Reintentando…"
                await session.commit()
                raise Retry(defer=attempt * 10) from e
            job.status = JobStatus.failed
            job.error = f"Falló tras {attempt} intentos: {e}"

        await session.commit()
        return job.status


async def startup(ctx: dict) -> None:
    settings.media_dir.mkdir(parents=True, exist_ok=True)
    ctx["claude"] = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key or None)
    ctx["fal"] = fal_client.AsyncClient(key=settings.fal_key or None)


async def shutdown(ctx: dict) -> None:
    await ctx["claude"].close()


class WorkerSettings:
    functions = [func(process_render, max_tries=settings.render_max_tries)]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    on_startup = startup
    on_shutdown = shutdown
    max_jobs = 4
    # Above fal_timeout_s, so a slow render fails inside process_render (and gets retried) first.
    job_timeout = settings.fal_timeout_s + 120

"""ARQ worker: takes queued render jobs and runs them through Claude and fal.ai.

Run with: arq app.worker.WorkerSettings
"""

import logging

import anthropic
import fal_client
from arq import Retry
from arq.connections import RedisSettings
from arq.worker import func

from .config import settings
from .db import SessionLocal
from .errors import PermanentError
from .models import JobStatus, RenderJob
from .prompting import write_render_prompt
from .rendering import render_image
from .storage import media_path, save_media

log = logging.getLogger("mantis.worker")


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
            # On a retry, reuse Claude's prompt if it's already there: only the failed step runs again.
            if job.render_prompt is None:
                result = await write_render_prompt(ctx["claude"], media_path(job.input_file), job.brief)
                job.render_prompt = result.prompt
                job.claude_notes = result.notes
                await session.commit()

            image = await render_image(ctx["fal"], media_path(job.input_file), job.render_prompt)
            job.result_file = save_media(image, ".jpg")
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

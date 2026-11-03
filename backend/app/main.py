from contextlib import asynccontextmanager
from typing import Annotated

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import get_session, init_db
from .models import RenderJob
from .schemas import RenderOut
from .storage import ALLOWED_IMAGE_TYPES, save_media


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.media_dir.mkdir(parents=True, exist_ok=True)
    await init_db()
    app.state.arq = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    yield
    await app.state.arq.aclose()


app = FastAPI(title="Mantis Render API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/media", StaticFiles(directory=settings.media_dir, check_dir=False), name="media")

Session = Annotated[AsyncSession, Depends(get_session)]


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/renders", status_code=201)
async def create_render(
    request: Request,
    session: Session,
    image: Annotated[UploadFile, File()],
    brief: Annotated[str, Form(min_length=3, max_length=2000)],
) -> RenderOut:
    suffix = ALLOWED_IMAGE_TYPES.get(image.content_type or "")
    if suffix is None:
        raise HTTPException(
            415, "Sube una imagen JPG, PNG o WebP (por ejemplo, una vista exportada de SketchUp)."
        )
    data = await image.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"La imagen supera los {settings.max_upload_mb} MB.")

    job = RenderJob(brief=brief.strip(), input_file=save_media(data, suffix))
    session.add(job)
    await session.commit()

    # Rendering takes from seconds to minutes, so the request returns now and the worker picks it up.
    await request.app.state.arq.enqueue_job("process_render", job.id, _job_id=job.id)
    return RenderOut.from_job(job)


@app.get("/renders")
async def list_renders(
    session: Session, limit: Annotated[int, Query(ge=1, le=100)] = 20
) -> list[RenderOut]:
    jobs = await session.scalars(
        select(RenderJob).order_by(RenderJob.created_at.desc()).limit(limit)
    )
    return [RenderOut.from_job(job) for job in jobs]


@app.get("/renders/{job_id}")
async def get_render(job_id: str, session: Session) -> RenderOut:
    job = await session.get(RenderJob, job_id)
    if job is None:
        raise HTTPException(404, "No existe ese render.")
    return RenderOut.from_job(job)

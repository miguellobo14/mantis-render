from collections import defaultdict
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
from .models import JobKind, JobStatus, RenderJob
from .presets import MODES, STYLES, presets_payload
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


async def _read_image(upload: UploadFile, example: str = "") -> tuple[bytes, str]:
    suffix = ALLOWED_IMAGE_TYPES.get(upload.content_type or "")
    if suffix is None:
        raise HTTPException(415, f"Sube una imagen JPG, PNG o WebP{example}.")
    data = await upload.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"La imagen supera los {settings.max_upload_mb} MB.")
    return data, suffix


async def _enqueue(request: Request, job: RenderJob) -> None:
    # Rendering takes from seconds to minutes, so the request returns now and the worker picks it up.
    await request.app.state.arq.enqueue_job("process_render", job.id, _job_id=job.id)


async def _source(session: AsyncSession, job_id: str, source_index: int) -> RenderJob:
    """The finished job whose version `source_index` an edit or upscale starts from."""
    parent = await session.get(RenderJob, job_id)
    if parent is None:
        raise HTTPException(404, "No existe ese render.")
    if parent.status != JobStatus.done:
        raise HTTPException(409, "Ese render todavía no está listo.")
    if parent.kind == JobKind.upscale:
        raise HTTPException(422, "Esa imagen ya está en 4K; edita o mejora la versión original.")
    if source_index >= len(parent.result_files):
        raise HTTPException(422, f"Ese render no tiene una versión {source_index + 1}.")
    return parent


def _derived_job(parent: RenderJob, kind: JobKind, source_index: int, brief: str) -> RenderJob:
    return RenderJob(
        kind=kind,
        brief=brief,
        # The parent's version is this job's input; no copy needed.
        input_file=parent.result_files[source_index],
        mode=parent.mode,
        style=parent.style,
        parent_id=parent.id,
        root_id=parent.root_id or parent.id,
        source_index=source_index,
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/presets")
async def presets() -> dict[str, list[dict[str, str]]]:
    return presets_payload()


@app.post("/renders", status_code=201)
async def create_render(
    request: Request,
    session: Session,
    image: Annotated[UploadFile, File()],
    brief: Annotated[str, Form(min_length=3, max_length=2000)],
    mode: Annotated[str, Form()] = "interior",
    style: Annotated[str | None, Form()] = None,
    variants: Annotated[int, Form(ge=1, le=4)] = 1,
    reference: Annotated[UploadFile | None, File()] = None,
) -> RenderOut:
    if mode not in MODES:
        raise HTTPException(422, f"Modo desconocido: {mode}. Opciones: {', '.join(MODES)}.")
    style = style or None
    if style is not None and style not in STYLES:
        raise HTTPException(422, f"Estilo desconocido: {style}. Opciones: {', '.join(STYLES)}.")

    data, suffix = await _read_image(image, " (por ejemplo, una vista exportada de SketchUp)")
    job = RenderJob(
        kind=JobKind.render,
        brief=brief.strip(),
        input_file=save_media(data, suffix),
        mode=mode,
        style=style,
        variants=variants,
    )
    if reference is not None:
        ref_data, ref_suffix = await _read_image(reference, " como referencia de estilo")
        job.reference_file = save_media(ref_data, ref_suffix)

    session.add(job)
    await session.commit()
    await _enqueue(request, job)
    return RenderOut.from_job(job)


@app.post("/renders/{job_id}/edit", status_code=201)
async def edit_render(
    job_id: str,
    request: Request,
    session: Session,
    instruction: Annotated[str, Form(min_length=3, max_length=500)],
    source_index: Annotated[int, Form(ge=0)] = 0,
    mask: Annotated[UploadFile | None, File()] = None,
) -> RenderOut:
    parent = await _source(session, job_id, source_index)
    job = _derived_job(parent, JobKind.edit, source_index, instruction.strip())
    if mask is not None:
        # The web app paints the mask on a canvas the size of the image and exports it as PNG.
        if mask.content_type != "image/png":
            raise HTTPException(415, "La máscara debe ser un PNG (blanco = zona a cambiar).")
        data = await mask.read()
        if len(data) > settings.max_upload_mb * 1024 * 1024:
            raise HTTPException(413, f"La máscara supera los {settings.max_upload_mb} MB.")
        job.mask_file = save_media(data, ".png")

    session.add(job)
    await session.commit()
    await _enqueue(request, job)
    return RenderOut.from_job(job)


@app.post("/renders/{job_id}/upscale", status_code=201)
async def upscale_render(
    job_id: str,
    request: Request,
    session: Session,
    source_index: Annotated[int, Form(ge=0)] = 0,
) -> RenderOut:
    parent = await _source(session, job_id, source_index)
    job = _derived_job(parent, JobKind.upscale, source_index, "Mejorar a 4K")
    session.add(job)
    await session.commit()
    await _enqueue(request, job)
    return RenderOut.from_job(job)


@app.get("/renders")
async def list_renders(
    session: Session, limit: Annotated[int, Query(ge=1, le=100)] = 20
) -> list[RenderOut]:
    """Original renders, newest first, each with its edits and upscales."""
    roots = list(
        await session.scalars(
            select(RenderJob)
            .where(RenderJob.parent_id.is_(None))
            .order_by(RenderJob.created_at.desc())
            .limit(limit)
        )
    )
    derived = await session.scalars(
        select(RenderJob)
        .where(RenderJob.root_id.in_([root.id for root in roots]))
        .order_by(RenderJob.created_at)
    )
    by_root: dict[str, list[RenderJob]] = defaultdict(list)
    for job in derived:
        by_root[job.root_id].append(job)
    return [RenderOut.from_job(root, by_root[root.id]) for root in roots]


@app.get("/renders/{job_id}")
async def get_render(job_id: str, session: Session) -> RenderOut:
    job = await session.get(RenderJob, job_id)
    if job is None:
        raise HTTPException(404, "No existe ese render.")
    derived = await session.scalars(
        select(RenderJob).where(RenderJob.root_id == job.id).order_by(RenderJob.created_at)
    )
    return RenderOut.from_job(job, derived)

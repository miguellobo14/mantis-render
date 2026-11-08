from collections.abc import Iterable
from datetime import datetime

from pydantic import BaseModel

from .models import JobKind, JobStatus, RenderJob
from .storage import media_url


class RenderOut(BaseModel):
    id: str
    kind: JobKind
    status: JobStatus
    brief: str
    mode: str
    style: str | None
    variants: int
    parent_id: str | None
    root_id: str | None
    source_index: int
    masked: bool
    render_prompt: str | None
    claude_notes: str | None
    error: str | None
    attempts: int
    input_url: str
    reference_url: str | None
    result_urls: list[str]
    # First version, kept for clients that only show one image.
    result_url: str | None
    created_at: datetime
    updated_at: datetime
    # Edits and upscales made from this render, oldest first (only filled on original renders).
    derived: list["RenderOut"] = []

    @classmethod
    def from_job(cls, job: RenderJob, derived: Iterable[RenderJob] = ()) -> "RenderOut":
        results = [media_url(name) for name in job.result_files or []]
        return cls(
            id=job.id,
            kind=job.kind,
            status=job.status,
            brief=job.brief,
            mode=job.mode,
            style=job.style,
            variants=job.variants,
            parent_id=job.parent_id,
            root_id=job.root_id,
            source_index=job.source_index,
            masked=job.mask_file is not None,
            render_prompt=job.render_prompt,
            claude_notes=job.claude_notes,
            error=job.error,
            attempts=job.attempts,
            input_url=media_url(job.input_file),
            reference_url=media_url(job.reference_file) if job.reference_file else None,
            result_urls=results,
            result_url=results[0] if results else None,
            created_at=job.created_at,
            updated_at=job.updated_at,
            derived=[cls.from_job(child) for child in derived],
        )

from datetime import datetime

from pydantic import BaseModel

from .models import JobStatus, RenderJob
from .storage import media_url


class RenderOut(BaseModel):
    id: str
    status: JobStatus
    brief: str
    render_prompt: str | None
    claude_notes: str | None
    error: str | None
    attempts: int
    input_url: str
    result_url: str | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_job(cls, job: RenderJob) -> "RenderOut":
        return cls(
            id=job.id,
            status=job.status,
            brief=job.brief,
            render_prompt=job.render_prompt,
            claude_notes=job.claude_notes,
            error=job.error,
            attempts=job.attempts,
            input_url=media_url(job.input_file),
            result_url=media_url(job.result_file) if job.result_file else None,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )

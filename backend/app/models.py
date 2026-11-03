from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def _now() -> datetime:
    return datetime.now(UTC)


class JobStatus(StrEnum):
    queued = "queued"
    processing = "processing"
    done = "done"
    failed = "failed"


class RenderJob(Base):
    __tablename__ = "render_jobs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    status: Mapped[JobStatus] = mapped_column(String(16), default=JobStatus.queued, index=True)
    brief: Mapped[str] = mapped_column(Text)
    input_file: Mapped[str] = mapped_column(String(64))

    # Written by Claude: the English instruction sent to fal.ai, and a note for the client.
    render_prompt: Mapped[str | None] = mapped_column(Text)
    claude_notes: Mapped[str | None] = mapped_column(Text)

    result_file: Mapped[str | None] = mapped_column(String(64))
    error: Mapped[str | None] = mapped_column(Text)
    attempts: Mapped[int] = mapped_column(default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

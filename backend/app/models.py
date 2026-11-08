from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def _now() -> datetime:
    return datetime.now(UTC)


class JobStatus(StrEnum):
    queued = "queued"
    processing = "processing"
    done = "done"
    failed = "failed"


class JobKind(StrEnum):
    render = "render"  # reference image + brief -> 1 to 4 versions
    edit = "edit"  # one version of a parent job + instruction (and optional mask) -> 1 image
    upscale = "upscale"  # one version of a parent job -> the same image at 4K


class RenderJob(Base):
    __tablename__ = "render_jobs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid4().hex)
    kind: Mapped[JobKind] = mapped_column(String(16), default=JobKind.render)
    status: Mapped[JobStatus] = mapped_column(String(16), default=JobStatus.queued, index=True)
    # The client's brief for a render, the change they asked for in an edit.
    brief: Mapped[str] = mapped_column(Text)
    input_file: Mapped[str] = mapped_column(String(64))

    mode: Mapped[str] = mapped_column(String(32), default="interior")
    style: Mapped[str | None] = mapped_column(String(32))
    variants: Mapped[int] = mapped_column(default=1)
    reference_file: Mapped[str | None] = mapped_column(String(64))
    mask_file: Mapped[str | None] = mapped_column(String(64))

    # Edits and upscales work on one version of an earlier job; root_id groups them under the
    # original render.
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("render_jobs.id"))
    root_id: Mapped[str | None] = mapped_column(String(32), index=True)
    source_index: Mapped[int] = mapped_column(default=0)

    # Written by Claude: the English instruction sent to fal.ai, and a note for the client.
    render_prompt: Mapped[str | None] = mapped_column(Text)
    claude_notes: Mapped[str | None] = mapped_column(Text)

    result_files: Mapped[list[str]] = mapped_column(JSON, default=list)
    error: Mapped[str | None] = mapped_column(Text)
    attempts: Mapped[int] = mapped_column(default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

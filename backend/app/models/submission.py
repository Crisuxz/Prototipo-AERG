from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.assignment import Assignment
from app.models.enums import ExtractionStatus
from app.models.mixins import enum_column, utcnow


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    assignment_id: Mapped[int | None] = mapped_column(ForeignKey("assignments.id"), nullable=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    student_identifier: Mapped[str] = mapped_column(String(128))
    original_filename: Mapped[str] = mapped_column(String(512))
    stored_filename: Mapped[str] = mapped_column(String(255))
    file_extension: Mapped[str] = mapped_column(String(8))
    mime_type: Mapped[str] = mapped_column(String(128))
    file_size_bytes: Mapped[int] = mapped_column()
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    extraction_status: Mapped[ExtractionStatus] = mapped_column(
        enum_column(ExtractionStatus), default=ExtractionStatus.PENDING
    )
    extraction_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    assignment: Mapped[Assignment | None] = relationship()

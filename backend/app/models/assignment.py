from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import utcnow


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    course_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    lms_integration_id: Mapped[int | None] = mapped_column(
        ForeignKey("lms_integrations.id"), nullable=True
    )
    # LTI 1.3: lineitem de AGS y contexto (curso) del launch que origino la actividad.
    lti_lineitem_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    lti_context_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

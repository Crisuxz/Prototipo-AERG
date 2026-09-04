from datetime import datetime
from typing import Any

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import LMSIntegrationType
from app.models.mixins import enum_column, utcnow


class LMSIntegration(Base):
    __tablename__ = "lms_integrations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[LMSIntegrationType] = mapped_column(enum_column(LMSIntegrationType))
    config: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

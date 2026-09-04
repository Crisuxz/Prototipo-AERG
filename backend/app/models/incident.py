from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import IncidentEntityType, IncidentSeverity, IncidentType
from app.models.mixins import enum_column, utcnow


class IncidentLog(Base):
    """Bitacora de incidencias. La referencia a la entidad relacionada es logica (sin FK)
    para poder registrar fallos ocurridos antes de que esa entidad exista (Parte 4)."""

    __tablename__ = "incident_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    related_entity_type: Mapped[IncidentEntityType] = mapped_column(enum_column(IncidentEntityType))
    related_entity_id: Mapped[int | None] = mapped_column(nullable=True)
    incident_type: Mapped[IncidentType] = mapped_column(enum_column(IncidentType))
    severity: Mapped[IncidentSeverity] = mapped_column(enum_column(IncidentSeverity))
    message: Mapped[str] = mapped_column(Text)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

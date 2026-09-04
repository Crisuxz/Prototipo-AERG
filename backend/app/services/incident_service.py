"""Registro centralizado de incidencias (RF-21, RI-07). Nunca almacena secretos:
los detalles se sanean quitando cualquier clave sensible antes de persistir."""

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.models.enums import IncidentEntityType, IncidentSeverity, IncidentType
from app.models.incident import IncidentLog
from app.repositories.incident_repository import IncidentRepository

logger = logging.getLogger(__name__)

SENSITIVE_KEYS = {"api_key", "gemini_api_key", "authorization", "token", "auth_token", "secret"}


def sanitize(details: dict[str, Any] | None) -> dict[str, Any] | None:
    if details is None:
        return None
    return {
        key: ("[REDACTED]" if key.lower() in SENSITIVE_KEYS else value)
        for key, value in details.items()
    }


class IncidentService:
    def __init__(self, db: Session):
        self.repository = IncidentRepository(db)

    def record(
        self,
        entity_type: IncidentEntityType,
        entity_id: int | None,
        incident_type: IncidentType,
        severity: IncidentSeverity,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> IncidentLog:
        incident = IncidentLog(
            related_entity_type=entity_type,
            related_entity_id=entity_id,
            incident_type=incident_type,
            severity=severity,
            message=message,
            details=sanitize(details),
        )
        severe = severity in (IncidentSeverity.ERROR, IncidentSeverity.CRITICAL)
        logger.log(
            logging.ERROR if severe else logging.WARNING,
            "Incidencia %s (%s) sobre %s#%s: %s",
            incident_type.value,
            severity.value,
            entity_type.value,
            entity_id,
            message,
        )
        return self.repository.add(incident)

    def list(self, **filters) -> list[IncidentLog]:
        return self.repository.list(**filters)

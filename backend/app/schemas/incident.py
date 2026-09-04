from datetime import datetime
from typing import Any

from app.models.enums import IncidentEntityType, IncidentSeverity, IncidentType
from app.schemas.common import ApiModel


class IncidentResponse(ApiModel):
    id: int
    related_entity_type: IncidentEntityType
    related_entity_id: int | None
    incident_type: IncidentType
    severity: IncidentSeverity
    message: str
    details: dict[str, Any] | None
    created_at: datetime

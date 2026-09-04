from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.models.enums import IncidentEntityType, IncidentSeverity, IncidentType
from app.models.incident import IncidentLog
from app.schemas.incident import IncidentResponse
from app.services.incident_service import IncidentService

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=list[IncidentResponse])
def list_incidents(
    db: DbSession,
    user: CurrentUser,
    incident_type: IncidentType | None = Query(default=None),
    severity: IncidentSeverity | None = Query(default=None),
    entity_type: IncidentEntityType | None = Query(default=None),
    entity_id: int | None = Query(default=None),
) -> list[IncidentLog]:
    return IncidentService(db).list(
        incident_type=incident_type,
        severity=severity,
        entity_type=entity_type,
        entity_id=entity_id,
    )

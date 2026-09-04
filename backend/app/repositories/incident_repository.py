from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import IncidentEntityType, IncidentSeverity, IncidentType
from app.models.incident import IncidentLog


class IncidentRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, incident: IncidentLog) -> IncidentLog:
        self.db.add(incident)
        self.db.flush()
        return incident

    def list(
        self,
        incident_type: IncidentType | None = None,
        severity: IncidentSeverity | None = None,
        entity_type: IncidentEntityType | None = None,
        entity_id: int | None = None,
        limit: int = 200,
    ) -> list[IncidentLog]:
        query = select(IncidentLog)
        if incident_type is not None:
            query = query.where(IncidentLog.incident_type == incident_type)
        if severity is not None:
            query = query.where(IncidentLog.severity == severity)
        if entity_type is not None:
            query = query.where(IncidentLog.related_entity_type == entity_type)
        if entity_id is not None:
            query = query.where(IncidentLog.related_entity_id == entity_id)
        return list(self.db.scalars(query.order_by(IncidentLog.created_at.desc()).limit(limit)).all())

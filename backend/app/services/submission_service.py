"""Recepcion de trabajos: valida, orquesta la extraccion y persiste (RF-03, RF-05, RD-08)."""

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import DomainError
from app.models.assignment import Assignment
from app.models.enums import (
    ExtractionStatus,
    IncidentEntityType,
    IncidentSeverity,
    IncidentType,
)
from app.models.submission import Submission
from app.models.user import User
from app.repositories.submission_repository import SubmissionRepository
from app.services.document_processing_service import DocumentProcessingService
from app.services.incident_service import IncidentService


class SubmissionService:
    def __init__(self, db: Session, settings: Settings):
        self.db = db
        self.repository = SubmissionRepository(db)
        self.incidents = IncidentService(db)
        self.documents = DocumentProcessingService(settings.max_upload_mb, settings.upload_dir)

    def get(self, submission_id: int) -> Submission:
        submission = self.repository.get(submission_id)
        if submission is None:
            raise DomainError("NOT_FOUND", "El trabajo solicitado no existe.", 404)
        return submission

    def list(self) -> list[Submission]:
        return self.repository.list()

    def create_from_upload(
        self,
        filename: str,
        content: bytes,
        mime_type: str | None,
        teacher: User,
        student_identifier: str,
        assignment_id: int | None = None,
    ) -> Submission:
        try:
            document = self.documents.process(filename, content, mime_type)
        except DomainError as error:
            incident_type = (
                IncidentType.EMPTY_DOCUMENT
                if error.code == "EMPTY_DOCUMENT"
                else IncidentType.EXTRACTION_FAILED
            )
            self.incidents.record(
                IncidentEntityType.SUBMISSION,
                None,
                incident_type,
                IncidentSeverity.WARNING if error.status_code < 500 else IncidentSeverity.ERROR,
                error.message,
                {"filename": filename, "error_code": error.code},
            )
            self.db.commit()
            raise

        submission = Submission(
            assignment_id=assignment_id,
            teacher_id=teacher.id,
            student_identifier=student_identifier,
            original_filename=document.safe_original_filename,
            stored_filename=document.stored_filename,
            file_extension=document.extension,
            mime_type=mime_type or "",
            file_size_bytes=document.size_bytes,
            extracted_text=document.text,
            extraction_status=ExtractionStatus.SUCCESS,
        )
        self.repository.add(submission)
        self.db.commit()
        self.db.refresh(submission)
        return submission

    def create_from_lms_simulator(
        self,
        teacher: User,
        student_identifier: str,
        content: str,
        assignment_title: str,
        course_name: str | None,
        external_assignment_id: str | None,
        lms_integration_id: int | None,
    ) -> Submission:
        """Entrega generada por el simulador de LMS (Nivel 1, RI-02): el 'archivo' es el
        texto plano recibido, procesado por la misma ruta de extraccion que una subida."""
        assignment = Assignment(
            external_id=external_assignment_id,
            title=assignment_title,
            course_name=course_name,
            lms_integration_id=lms_integration_id,
        )
        self.db.add(assignment)
        self.db.flush()

        submission = self.create_from_upload(
            filename="lms-" + str(assignment.id) + ".txt",
            content=content.encode("utf-8"),
            mime_type="text/plain",
            teacher=teacher,
            student_identifier=student_identifier,
            assignment_id=assignment.id,
        )
        return submission

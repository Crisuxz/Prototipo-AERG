from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import ExtractionStatus
from app.schemas.common import ApiModel


class SubmissionResponse(ApiModel):
    id: int
    assignment_id: int | None
    teacher_id: int
    student_identifier: str
    original_filename: str
    file_extension: str
    mime_type: str
    file_size_bytes: int
    extracted_text: str | None
    extraction_status: ExtractionStatus
    extraction_error: str | None
    created_at: datetime


class SimulatorSubmissionRequest(BaseModel):
    """Entrega simulada 'como si' viniera de un LMS (Nivel 1, RI-02)."""

    assignment_title: str = Field(min_length=1, max_length=255)
    course_name: str | None = None
    external_assignment_id: str | None = None
    student_identifier: str = Field(min_length=1, max_length=128)
    content: str = Field(min_length=1)

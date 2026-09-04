from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import EvaluationStatus, GenerationValidationStatus, RevisionField
from app.schemas.common import ApiModel
from app.schemas.submission import SubmissionResponse


class EvaluationCreateRequest(BaseModel):
    submission_id: int
    rubric_id: int
    teacher_instructions: str | None = None


class RegenerateRequest(BaseModel):
    teacher_instructions: str | None = None


class CriterionReviewRequest(BaseModel):
    criterion_id: int
    final_score: float | None = None
    final_feedback: str | None = None


class EvaluationReviewRequest(BaseModel):
    criteria: list[CriterionReviewRequest] = Field(default_factory=list)
    general_feedback: str | None = None


class CriterionResultResponse(ApiModel):
    id: int
    criterion_id: int
    criterion_name: str
    weight: float
    selected_level_id: int | None
    ai_suggested_score: float | None
    final_score: float
    weighted_score: float
    ai_feedback: str
    final_feedback: str
    evidence: list[str]
    improvement_suggestion: str
    modified_by_teacher: bool


class GenerationResponse(ApiModel):
    id: int
    generation_number: int
    prompt_version: str
    model_name: str
    prompt_context_summary: dict[str, Any]
    raw_response: dict[str, Any] | None
    validation_status: GenerationValidationStatus
    validation_errors: list[str] | None
    latency_ms: int | None
    created_at: datetime


class RevisionResponse(ApiModel):
    id: int
    criterion_result_id: int | None
    field_changed: RevisionField
    previous_value: str
    new_value: str
    changed_by: int
    changed_at: datetime


class EvaluationResponse(ApiModel):
    id: int
    submission_id: int
    rubric_id: int
    teacher_instructions: str | None
    general_feedback: str | None
    status: EvaluationStatus
    current_generation_id: int | None
    final_total_score: float | None
    final_max_score: float | None
    approved_by: int | None
    approved_at: datetime | None
    sent_to_lms_at: datetime | None
    created_at: datetime
    updated_at: datetime
    criterion_results: list[CriterionResultResponse]


class EvaluationSummaryResponse(ApiModel):
    id: int
    status: EvaluationStatus
    rubric_id: int
    rubric_name: str
    submission_id: int
    student_identifier: str
    original_filename: str
    final_total_score: float | None
    final_max_score: float | None
    generations_count: int
    sent_to_lms_at: datetime | None
    created_at: datetime
    updated_at: datetime


class EvaluationDetailResponse(EvaluationResponse):
    """Detalle con trazabilidad completa (RF-19/RD-06): snapshot de rubrica, todas las
    generaciones de IA y todas las revisiones humanas."""

    rubric_version_snapshot: dict[str, Any]
    submission: SubmissionResponse
    generations: list[GenerationResponse]
    revisions: list[RevisionResponse]
    lms_result_payload: dict[str, Any] | None

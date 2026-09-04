from datetime import datetime

from fastapi import APIRouter, Query, status

from app.api.deps import AppSettings, CurrentUser, DbSession, GeminiDep
from app.models.enums import EvaluationStatus
from app.models.evaluation import Evaluation
from app.schemas.evaluation import (
    EvaluationCreateRequest,
    EvaluationDetailResponse,
    EvaluationResponse,
    EvaluationReviewRequest,
    EvaluationSummaryResponse,
    RegenerateRequest,
)
from app.services.evaluation_service import EvaluationService

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


def _to_summary(evaluation: Evaluation) -> EvaluationSummaryResponse:
    return EvaluationSummaryResponse(
        id=evaluation.id,
        status=evaluation.status,
        rubric_id=evaluation.rubric_id,
        rubric_name=evaluation.rubric.name,
        submission_id=evaluation.submission_id,
        student_identifier=evaluation.submission.student_identifier,
        original_filename=evaluation.submission.original_filename,
        final_total_score=evaluation.final_total_score,
        final_max_score=evaluation.final_max_score,
        generations_count=len(evaluation.generations),
        sent_to_lms_at=evaluation.sent_to_lms_at,
        created_at=evaluation.created_at,
        updated_at=evaluation.updated_at,
    )


@router.post("", response_model=EvaluationResponse, status_code=status.HTTP_201_CREATED)
def create_evaluation(
    payload: EvaluationCreateRequest,
    db: DbSession,
    settings: AppSettings,
    user: CurrentUser,
    gemini: GeminiDep,
) -> Evaluation:
    return EvaluationService(db, settings, gemini).create_evaluation(
        payload.submission_id, payload.rubric_id, payload.teacher_instructions
    )


@router.get("", response_model=list[EvaluationSummaryResponse])
def list_evaluations(
    db: DbSession,
    settings: AppSettings,
    user: CurrentUser,
    gemini: GeminiDep,
    status_filter: EvaluationStatus | None = Query(default=None, alias="status"),
    rubric_id: int | None = Query(default=None),
    date_from: datetime | None = Query(default=None, alias="from"),
    date_to: datetime | None = Query(default=None, alias="to"),
) -> list[EvaluationSummaryResponse]:
    evaluations = EvaluationService(db, settings, gemini).list(
        status=status_filter, rubric_id=rubric_id, date_from=date_from, date_to=date_to
    )
    return [_to_summary(evaluation) for evaluation in evaluations]


@router.get("/{evaluation_id}", response_model=EvaluationDetailResponse)
def get_evaluation(
    evaluation_id: int,
    db: DbSession,
    settings: AppSettings,
    user: CurrentUser,
    gemini: GeminiDep,
) -> Evaluation:
    return EvaluationService(db, settings, gemini).get(evaluation_id)


@router.post("/{evaluation_id}/regenerate", response_model=EvaluationResponse)
def regenerate_evaluation(
    evaluation_id: int,
    payload: RegenerateRequest,
    db: DbSession,
    settings: AppSettings,
    user: CurrentUser,
    gemini: GeminiDep,
) -> Evaluation:
    return EvaluationService(db, settings, gemini).regenerate(
        evaluation_id, payload.teacher_instructions
    )


@router.put("/{evaluation_id}/review", response_model=EvaluationResponse)
def review_evaluation(
    evaluation_id: int,
    payload: EvaluationReviewRequest,
    db: DbSession,
    settings: AppSettings,
    user: CurrentUser,
    gemini: GeminiDep,
) -> Evaluation:
    return EvaluationService(db, settings, gemini).review(evaluation_id, payload, user)


@router.post("/{evaluation_id}/approve", response_model=EvaluationResponse)
def approve_evaluation(
    evaluation_id: int,
    db: DbSession,
    settings: AppSettings,
    user: CurrentUser,
    gemini: GeminiDep,
) -> Evaluation:
    return EvaluationService(db, settings, gemini).approve(evaluation_id, user)

"""Orquestador del ciclo de evaluacion (RF-06 a RF-20).

Es el unico servicio que invoca a GeminiService, y aplica la regla fundamental del plan:
la IA propone, el backend valida contra el snapshot de rubrica y el ScoringEngine calcula.
Ningun numero devuelto por el modelo llega a la calificacion sin pasar por esa validacion."""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import DomainError
from app.integrations.gemini.prompt_builder import EvaluationContext, detect_suspicious_content
from app.integrations.gemini.service import GeminiCallResult, GeminiService
from app.models.enums import (
    EvaluationStatus,
    GenerationValidationStatus,
    IncidentEntityType,
    IncidentSeverity,
    IncidentType,
    RevisionField,
    RubricStatus,
)
from app.models.evaluation import (
    Evaluation,
    EvaluationCriterionResult,
    EvaluationGeneration,
    EvaluationRevision,
)
from app.models.rubric import Rubric
from app.models.user import User
from app.repositories.evaluation_repository import EvaluationRepository
from app.repositories.rubric_repository import RubricRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.evaluation import EvaluationReviewRequest
from app.services import scoring
from app.services.incident_service import IncidentService
from app.services.lms_integration_service import LMSIntegrationService

logger = logging.getLogger(__name__)

RETRYABLE_STATUSES = {
    GenerationValidationStatus.INVALID_SCHEMA,
    GenerationValidationStatus.INVALID_CRITERIA,
}
TRANSPORT_ERRORS = {
    GenerationValidationStatus.TIMEOUT: ("GEMINI_TIMEOUT", 504),
    GenerationValidationStatus.HTTP_ERROR: ("GEMINI_UNAVAILABLE", 502),
    GenerationValidationStatus.BLOCKED: ("GEMINI_UNAVAILABLE", 502),
}


@dataclass
class ValidatedCriterion:
    criterion_id: int
    criterion_name: str
    weight: float
    selected_level_id: int | None
    suggested_score: float
    feedback: str
    evidence: list[str]
    improvement_suggestion: str


def build_rubric_snapshot(rubric: Rubric) -> dict:
    """Copia inmutable de la rubrica al momento de evaluar (Parte 27). Editar la rubrica
    despues no altera las evaluaciones ya creadas porque estas leen su propio snapshot."""
    return {
        "rubric_id": rubric.id,
        "name": rubric.name,
        "description": rubric.description,
        "instructions": rubric.instructions,
        "version": rubric.version,
        "criteria": [
            {
                "id": criterion.id,
                "name": criterion.name,
                "description": criterion.description,
                "weight": float(criterion.weight),
                "order": criterion.order,
                "levels": [
                    {
                        "id": level.id,
                        "name": level.name,
                        "description": level.description,
                        "score": float(level.score),
                        "order": level.order,
                    }
                    for level in criterion.levels
                ],
            }
            for criterion in rubric.criteria
        ],
    }


def validate_against_snapshot(
    payload, snapshot: dict
) -> tuple[list[ValidatedCriterion], GenerationValidationStatus, list[str]]:
    """Pipeline de validacion de la respuesta de la IA (Parte 43, pasos 2 a 4).

    Un criterio inventado o un nivel inexistente invalidan la generacion completa; un
    puntaje fuera de rango se reporta como INVALID_SCORE y, si aun asi se decide usar la
    propuesta, el ScoringEngine lo acota al maximo real del criterio."""
    criteria_by_id = {str(criterion["id"]): criterion for criterion in snapshot["criteria"]}
    returned_ids = [item.criterion_id for item in payload.evaluation.criteria]

    missing = set(criteria_by_id) - set(returned_ids)
    extra = set(returned_ids) - set(criteria_by_id)
    duplicated = len(returned_ids) != len(set(returned_ids))
    if missing or extra or duplicated:
        errors = []
        if missing:
            errors.append("Faltan criterios de la rubrica: " + ", ".join(sorted(missing)) + ".")
        if extra:
            errors.append(
                "Se devolvieron criterios inexistentes en la rubrica: " + ", ".join(sorted(extra)) + "."
            )
        if duplicated:
            errors.append("Se devolvieron criterios repetidos.")
        return [], GenerationValidationStatus.INVALID_CRITERIA, errors

    validated: list[ValidatedCriterion] = []
    level_errors: list[str] = []
    score_errors: list[str] = []

    for item in payload.evaluation.criteria:
        criterion = criteria_by_id[item.criterion_id]
        matched = next(
            (
                level
                for level in criterion["levels"]
                if level["name"].strip().lower() == item.selected_level.strip().lower()
            ),
            None,
        )
        if matched is None:
            level_errors.append(
                "El nivel indicado no existe en el criterio " + criterion["name"] + "."
            )
            continue

        maximum = scoring.max_level_score(criterion)
        if item.suggested_score < 0 or item.suggested_score > maximum:
            score_errors.append(
                "El puntaje del criterio "
                + criterion["name"]
                + " debe estar entre 0 y "
                + format(maximum, "g")
                + "."
            )

        validated.append(
            ValidatedCriterion(
                criterion_id=int(criterion["id"]),
                criterion_name=criterion["name"],
                weight=float(criterion["weight"]),
                selected_level_id=int(matched["id"]),
                suggested_score=float(item.suggested_score),
                feedback=item.feedback,
                evidence=list(item.evidence),
                improvement_suggestion=item.improvement_suggestion,
            )
        )

    if level_errors:
        return [], GenerationValidationStatus.INVALID_CRITERIA, level_errors
    if score_errors:
        return validated, GenerationValidationStatus.INVALID_SCORE, score_errors
    return validated, GenerationValidationStatus.VALID, []


class EvaluationService:
    def __init__(self, db: Session, settings: Settings, gemini: GeminiService | None = None):
        self.db = db
        self.settings = settings
        self.repository = EvaluationRepository(db)
        self.rubrics = RubricRepository(db)
        self.submissions = SubmissionRepository(db)
        self.incidents = IncidentService(db)
        self.gemini = gemini or GeminiService(settings)
        self.lms = LMSIntegrationService(db)

    # ------------------------------------------------------------------- lectura

    def get(self, evaluation_id: int) -> Evaluation:
        evaluation = self.repository.get(evaluation_id)
        if evaluation is None:
            raise DomainError("NOT_FOUND", "La evaluacion solicitada no existe.", 404)
        return evaluation

    def list(self, **filters) -> list[Evaluation]:
        return self.repository.list(**filters)

    # ------------------------------------------------------------------ creacion

    def create_evaluation(
        self, submission_id: int, rubric_id: int, teacher_instructions: str | None
    ) -> Evaluation:
        submission = self.submissions.get(submission_id)
        if submission is None:
            raise DomainError("NOT_FOUND", "El trabajo indicado no existe.", 404)
        if not (submission.extracted_text or "").strip():
            raise DomainError(
                "EMPTY_DOCUMENT", "El trabajo no tiene texto extraido para evaluar.", 422
            )

        rubric = self.rubrics.get(rubric_id)
        if rubric is None:
            raise DomainError("NOT_FOUND", "La rubrica indicada no existe.", 404)
        if rubric.status != RubricStatus.PUBLISHED:
            raise DomainError(
                "INVALID_RUBRIC", "Solo puede evaluarse con una rubrica publicada.", 422
            )

        evaluation = Evaluation(
            submission_id=submission.id,
            rubric_id=rubric.id,
            rubric_version_snapshot=build_rubric_snapshot(rubric),
            teacher_instructions=teacher_instructions,
            status=EvaluationStatus.PROCESSING,
        )
        self.repository.add(evaluation)
        self.db.commit()

        self._run_generation(evaluation, teacher_instructions)
        return self.get(evaluation.id)

    def regenerate(self, evaluation_id: int, teacher_instructions: str | None) -> Evaluation:
        evaluation = self.get(evaluation_id)
        self._assert_not_approved(evaluation)
        if teacher_instructions is not None:
            evaluation.teacher_instructions = teacher_instructions
        self._run_generation(evaluation, evaluation.teacher_instructions)
        return self.get(evaluation.id)

    # ----------------------------------------------------------------------- IA

    def _run_generation(self, evaluation: Evaluation, teacher_instructions: str | None) -> None:
        submission_text, truncated = self._prepare_text(evaluation)
        if truncated:
            self.incidents.record(
                IncidentEntityType.EVALUATION,
                evaluation.id,
                IncidentType.SUBMISSION_TRUNCATED,
                IncidentSeverity.WARNING,
                "El texto del trabajo se trunco a "
                + str(self.settings.max_submission_chars)
                + " caracteres.",
            )

        suspicious = detect_suspicious_content(submission_text)
        if suspicious:
            # Solo auditoria: el contenido del trabajo no se censura, se evalua (Parte 45.f).
            self.incidents.record(
                IncidentEntityType.EVALUATION,
                evaluation.id,
                IncidentType.SUSPICIOUS_CONTENT,
                IncidentSeverity.WARNING,
                "El trabajo contiene patrones compatibles con prompt injection.",
                {"patterns": suspicious},
            )

        generation_number = len(evaluation.generations) + 1
        context = EvaluationContext(
            evaluation_id=evaluation.id,
            generation_number=generation_number,
            rubric_snapshot=evaluation.rubric_version_snapshot,
            submission_text=submission_text,
            teacher_instructions=teacher_instructions,
        )

        result = self.gemini.evaluate(context)
        validated, status, errors = self._validate(result, evaluation)

        # Reintento acotado a una sola vez y solo ante errores de forma (Parte 44).
        if status in RETRYABLE_STATUSES:
            self._persist_generation(evaluation, generation_number, result, status, errors)
            self.db.commit()
            generation_number += 1
            context.correction_errors = errors
            context.generation_number = generation_number
            result = self.gemini.evaluate(context)
            validated, status, errors = self._validate(result, evaluation)

        generation = self._persist_generation(evaluation, generation_number, result, status, errors)

        if status == GenerationValidationStatus.VALID:
            evaluation.current_generation_id = generation.id
            evaluation.general_feedback = result.payload.evaluation.general_feedback
            self._apply_generation(evaluation, validated)
            evaluation.status = EvaluationStatus.AI_GENERATED
            self.db.commit()
            return

        self._handle_failed_generation(evaluation, status, errors)

    def _validate(self, result: GeminiCallResult, evaluation: Evaluation):
        if result.payload is None:
            return [], result.status, result.errors
        return validate_against_snapshot(result.payload, evaluation.rubric_version_snapshot)

    def _persist_generation(
        self,
        evaluation: Evaluation,
        generation_number: int,
        result: GeminiCallResult,
        status: GenerationValidationStatus,
        errors: list[str],
    ) -> EvaluationGeneration:
        snapshot = evaluation.rubric_version_snapshot
        generation = EvaluationGeneration(
            evaluation_id=evaluation.id,
            generation_number=generation_number,
            prompt_version=result.prompt_version,
            model_name=result.model_name,
            prompt_context_summary={
                "rubric_id": snapshot.get("rubric_id"),
                "rubric_version": snapshot.get("version"),
                "criteria_ids": [criterion["id"] for criterion in snapshot.get("criteria", [])],
                "teacher_instructions": evaluation.teacher_instructions,
                "submission_id": evaluation.submission_id,
            },
            raw_response=result.raw_response,
            validation_status=status,
            validation_errors=errors or None,
            latency_ms=result.latency_ms,
        )
        self.db.add(generation)
        self.db.flush()
        return generation

    def _apply_generation(self, evaluation: Evaluation, validated: list[ValidatedCriterion]) -> None:
        """Reemplaza los resultados por criterio con la propuesta validada y recalcula la
        puntuacion con el ScoringEngine, nunca con los numeros crudos del modelo."""
        totals = scoring.compute(
            evaluation.rubric_version_snapshot,
            {item.criterion_id: item.suggested_score for item in validated},
        )
        computed = {item.criterion_id: item for item in totals.criteria}

        evaluation.criterion_results.clear()
        self.db.flush()

        for item in validated:
            score = computed[item.criterion_id]
            if score.was_clamped:
                self.incidents.record(
                    IncidentEntityType.EVALUATION,
                    evaluation.id,
                    IncidentType.AI_SCORE_CLAMPED,
                    IncidentSeverity.WARNING,
                    "El puntaje sugerido para el criterio "
                    + item.criterion_name
                    + " se acoto al rango definido en la rubrica.",
                    {"criterion_id": item.criterion_id, "suggested": item.suggested_score},
                )
            evaluation.criterion_results.append(
                EvaluationCriterionResult(
                    criterion_id=item.criterion_id,
                    criterion_name=item.criterion_name,
                    weight=item.weight,
                    selected_level_id=item.selected_level_id,
                    ai_suggested_score=item.suggested_score,
                    final_score=score.final_score,
                    weighted_score=score.weighted_score,
                    ai_feedback=item.feedback,
                    final_feedback=item.feedback,
                    evidence=item.evidence,
                    improvement_suggestion=item.improvement_suggestion,
                    modified_by_teacher=False,
                )
            )

        evaluation.final_total_score = totals.final_total_score
        evaluation.final_max_score = totals.final_max_score

    def _handle_failed_generation(
        self, evaluation: Evaluation, status: GenerationValidationStatus, errors: list[str]
    ) -> None:
        incident_type = {
            GenerationValidationStatus.TIMEOUT: IncidentType.GEMINI_TIMEOUT,
            GenerationValidationStatus.HTTP_ERROR: IncidentType.GEMINI_HTTP_ERROR,
            GenerationValidationStatus.BLOCKED: IncidentType.GEMINI_BLOCKED,
        }.get(status, IncidentType.INVALID_AI_RESPONSE)

        self.incidents.record(
            IncidentEntityType.EVALUATION,
            evaluation.id,
            incident_type,
            IncidentSeverity.ERROR,
            "La generacion de la evaluacion fallo con estado " + status.value + ".",
            {"errors": errors},
        )

        # Si ya existia una propuesta valida previa se conserva, y el docente puede
        # regenerar manualmente; solo se marca FAILED cuando no hay nada que mostrar.
        if evaluation.current_generation_id is None:
            evaluation.status = EvaluationStatus.FAILED
        self.db.commit()

        if status in TRANSPORT_ERRORS:
            code, http_status = TRANSPORT_ERRORS[status]
            raise DomainError(
                code, errors[0] if errors else "Fallo la llamada a Gemini.", http_status
            )
        raise DomainError(
            "INVALID_AI_RESPONSE",
            "La propuesta generada no cumplio el contrato esperado. " + " ".join(errors),
            502,
        )

    def _prepare_text(self, evaluation: Evaluation) -> tuple[str, bool]:
        text = (evaluation.submission.extracted_text or "").strip()
        limit = self.settings.max_submission_chars
        if len(text) > limit:
            return text[:limit], True
        return text, False

    # ------------------------------------------------------------------ revision

    def review(self, evaluation_id: int, payload: EvaluationReviewRequest, user: User) -> Evaluation:
        evaluation = self.get(evaluation_id)
        self._assert_not_approved(evaluation)

        results_by_criterion = {
            result.criterion_id: result for result in evaluation.criterion_results
        }
        snapshot_by_criterion = {
            int(criterion["id"]): criterion
            for criterion in evaluation.rubric_version_snapshot["criteria"]
        }

        for edit in payload.criteria:
            result = results_by_criterion.get(edit.criterion_id)
            if result is None:
                raise DomainError(
                    "VALIDATION_ERROR",
                    "El criterio " + str(edit.criterion_id) + " no pertenece a esta evaluacion.",
                    422,
                )
            if edit.final_score is not None:
                maximum = scoring.max_level_score(snapshot_by_criterion[edit.criterion_id])
                if edit.final_score < 0 or edit.final_score > maximum:
                    raise DomainError(
                        "VALIDATION_ERROR",
                        "El puntaje del criterio "
                        + result.criterion_name
                        + " debe estar entre 0 y "
                        + format(maximum, "g")
                        + ".",
                        422,
                    )
                if edit.final_score != result.final_score:
                    self._record_revision(
                        evaluation,
                        result,
                        RevisionField.SCORE,
                        result.final_score,
                        edit.final_score,
                        user,
                    )
                    result.final_score = edit.final_score
                    result.modified_by_teacher = True
            if edit.final_feedback is not None and edit.final_feedback != result.final_feedback:
                self._record_revision(
                    evaluation,
                    result,
                    RevisionField.FEEDBACK,
                    result.final_feedback,
                    edit.final_feedback,
                    user,
                )
                result.final_feedback = edit.final_feedback
                result.modified_by_teacher = True

        if payload.general_feedback is not None and payload.general_feedback != (
            evaluation.general_feedback or ""
        ):
            self._record_revision(
                evaluation,
                None,
                RevisionField.GENERAL_FEEDBACK,
                evaluation.general_feedback or "",
                payload.general_feedback,
                user,
            )
            evaluation.general_feedback = payload.general_feedback

        self._recompute(evaluation)
        evaluation.status = EvaluationStatus.UNDER_REVIEW
        self.db.commit()
        return self.get(evaluation.id)

    def approve(self, evaluation_id: int, user: User) -> Evaluation:
        evaluation = self.get(evaluation_id)
        self._assert_not_approved(evaluation)
        if evaluation.status not in (EvaluationStatus.AI_GENERATED, EvaluationStatus.UNDER_REVIEW):
            raise DomainError(
                "CONFLICT", "Solo puede aprobarse una evaluacion con propuesta generada.", 409
            )

        expected = {
            int(criterion["id"]) for criterion in evaluation.rubric_version_snapshot["criteria"]
        }
        resolved = {result.criterion_id for result in evaluation.criterion_results}
        if expected != resolved:
            raise DomainError(
                "CONFLICT", "Hay criterios de la rubrica sin resolver en esta evaluacion.", 409
            )

        self._recompute(evaluation)
        evaluation.status = EvaluationStatus.APPROVED
        evaluation.approved_by = user.id
        evaluation.approved_at = datetime.now(timezone.utc)
        self.db.commit()

        self._send_to_lms(evaluation)
        return self.get(evaluation.id)

    def _send_to_lms(self, evaluation: Evaluation) -> None:
        """Solo una evaluacion APPROVED se envia al LMS (RD-05). Un fallo de envio queda
        registrado como incidencia pero nunca revierte la aprobacion (criterio Iteracion 7)."""
        adapter = self.lms.get_active_adapter()
        if adapter is None:
            return
        result = adapter.send_result(evaluation)
        evaluation.lms_result_payload = result.payload
        if result.success:
            evaluation.sent_to_lms_at = datetime.now(timezone.utc)
        else:
            self.incidents.record(
                IncidentEntityType.LMS_INTEGRATION,
                adapter.integration_id,
                IncidentType.LMS_SEND_FAILED,
                IncidentSeverity.ERROR,
                result.error_message or "No fue posible enviar el resultado al LMS.",
                {"evaluation_id": evaluation.id},
            )
        self.db.commit()

    def _recompute(self, evaluation: Evaluation) -> None:
        totals = scoring.compute(
            evaluation.rubric_version_snapshot,
            {result.criterion_id: result.final_score for result in evaluation.criterion_results},
        )
        computed = {item.criterion_id: item for item in totals.criteria}
        for result in evaluation.criterion_results:
            score = computed[result.criterion_id]
            result.final_score = score.final_score
            result.weighted_score = score.weighted_score
        evaluation.final_total_score = totals.final_total_score
        evaluation.final_max_score = totals.final_max_score

    def _record_revision(self, evaluation, result, field, previous, new, user: User) -> None:
        self.db.add(
            EvaluationRevision(
                evaluation_id=evaluation.id,
                criterion_result_id=result.id if result is not None else None,
                field_changed=field,
                previous_value=str(previous),
                new_value=str(new),
                changed_by=user.id,
            )
        )

    @staticmethod
    def _assert_not_approved(evaluation: Evaluation) -> None:
        if evaluation.status == EvaluationStatus.APPROVED:
            raise DomainError("CONFLICT", "Una evaluacion aprobada ya no puede modificarse.", 409)

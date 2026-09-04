"""Interfaz comun de integracion con un LMS (RI-01, RF-20).

El flujo de aprobacion depende de esta abstraccion, no de un LMS concreto: el simulador
(Nivel 1) y LTI 1.3 (Nivel 2) son intercambiables sin tocar EvaluationService."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class LMSSendResult:
    success: bool
    payload: dict[str, Any]
    error_message: str | None = None


class LMSAdapter(ABC):
    """Contrato minimo: convertir una evaluacion aprobada en un resultado para el LMS."""

    def __init__(self, integration_id: int | None, config: dict[str, Any] | None = None):
        self.integration_id = integration_id
        self.config = config or {}

    @abstractmethod
    def send_result(self, evaluation) -> LMSSendResult: ...

    @staticmethod
    def build_payload(evaluation) -> dict[str, Any]:
        return {
            "evaluation_id": evaluation.id,
            "submission_id": evaluation.submission_id,
            "student_identifier": evaluation.submission.student_identifier,
            "assignment_external_id": (
                evaluation.submission.assignment.external_id
                if evaluation.submission.assignment
                else None
            ),
            "score_given": evaluation.final_total_score,
            "score_maximum": evaluation.final_max_score,
            "comment": evaluation.general_feedback or "",
            "criteria": [
                {
                    "criterion_id": result.criterion_id,
                    "criterion_name": result.criterion_name,
                    "final_score": result.final_score,
                    "weighted_score": result.weighted_score,
                    "feedback": result.final_feedback,
                }
                for result in evaluation.criterion_results
            ],
            "approved_at": evaluation.approved_at.isoformat() if evaluation.approved_at else None,
        }

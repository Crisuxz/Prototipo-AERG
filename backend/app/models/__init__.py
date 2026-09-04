"""Entidades SQLAlchemy. Se importan aqui para que Base.metadata las descubra (Alembic)."""

from app.models.assignment import Assignment
from app.models.evaluation import (
    Evaluation,
    EvaluationCriterionResult,
    EvaluationGeneration,
    EvaluationRevision,
)
from app.models.incident import IncidentLog
from app.models.lms_integration import LMSIntegration
from app.models.rubric import PerformanceLevel, Rubric, RubricCriterion
from app.models.submission import Submission
from app.models.user import User

__all__ = [
    "Assignment",
    "Evaluation",
    "EvaluationCriterionResult",
    "EvaluationGeneration",
    "EvaluationRevision",
    "IncidentLog",
    "LMSIntegration",
    "PerformanceLevel",
    "Rubric",
    "RubricCriterion",
    "Submission",
    "User",
]

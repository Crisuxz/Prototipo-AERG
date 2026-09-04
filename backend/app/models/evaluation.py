from datetime import datetime
from typing import Any

from sqlalchemy import JSON, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import EvaluationStatus, GenerationValidationStatus, RevisionField
from app.models.mixins import enum_column, utcnow
from app.models.rubric import Rubric
from app.models.submission import Submission


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id"))
    rubric_id: Mapped[int] = mapped_column(ForeignKey("rubrics.id"))
    rubric_version_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON)
    teacher_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    general_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[EvaluationStatus] = mapped_column(
        enum_column(EvaluationStatus), default=EvaluationStatus.DRAFT
    )
    current_generation_id: Mapped[int | None] = mapped_column(
        ForeignKey("evaluation_generations.id", use_alter=True, name="fk_evaluation_current_generation"),
        nullable=True,
    )
    final_total_score: Mapped[float | None] = mapped_column(Numeric(8, 2, asdecimal=False), nullable=True)
    final_max_score: Mapped[float | None] = mapped_column(Numeric(8, 2, asdecimal=False), nullable=True)
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    sent_to_lms_at: Mapped[datetime | None] = mapped_column(nullable=True)
    lms_result_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    submission: Mapped[Submission] = relationship()
    rubric: Mapped[Rubric] = relationship()
    criterion_results: Mapped[list["EvaluationCriterionResult"]] = relationship(
        back_populates="evaluation",
        cascade="all, delete-orphan",
        order_by="EvaluationCriterionResult.id",
    )
    generations: Mapped[list["EvaluationGeneration"]] = relationship(
        back_populates="evaluation",
        cascade="all, delete-orphan",
        order_by="EvaluationGeneration.generation_number",
        foreign_keys="EvaluationGeneration.evaluation_id",
    )
    revisions: Mapped[list["EvaluationRevision"]] = relationship(
        back_populates="evaluation",
        cascade="all, delete-orphan",
        order_by="EvaluationRevision.changed_at",
    )


class EvaluationCriterionResult(Base):
    __tablename__ = "evaluation_criterion_results"
    __table_args__ = (
        UniqueConstraint("evaluation_id", "criterion_id", name="uq_result_per_criterion"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    evaluation_id: Mapped[int] = mapped_column(ForeignKey("evaluations.id", ondelete="CASCADE"))
    criterion_id: Mapped[int] = mapped_column()
    criterion_name: Mapped[str] = mapped_column(String(255))
    weight: Mapped[float] = mapped_column(Numeric(6, 2, asdecimal=False))
    selected_level_id: Mapped[int | None] = mapped_column(nullable=True)
    ai_suggested_score: Mapped[float | None] = mapped_column(Numeric(8, 2, asdecimal=False), nullable=True)
    final_score: Mapped[float] = mapped_column(Numeric(8, 2, asdecimal=False), default=0)
    weighted_score: Mapped[float] = mapped_column(Numeric(8, 2, asdecimal=False), default=0)
    ai_feedback: Mapped[str] = mapped_column(Text, default="")
    final_feedback: Mapped[str] = mapped_column(Text, default="")
    evidence: Mapped[list[str]] = mapped_column(JSON, default=list)
    improvement_suggestion: Mapped[str] = mapped_column(Text, default="")
    modified_by_teacher: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    evaluation: Mapped[Evaluation] = relationship(back_populates="criterion_results")


class EvaluationGeneration(Base):
    __tablename__ = "evaluation_generations"

    id: Mapped[int] = mapped_column(primary_key=True)
    evaluation_id: Mapped[int] = mapped_column(ForeignKey("evaluations.id", ondelete="CASCADE"))
    generation_number: Mapped[int] = mapped_column()
    prompt_version: Mapped[str] = mapped_column(String(16))
    model_name: Mapped[str] = mapped_column(String(128))
    prompt_context_summary: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    raw_response: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    validation_status: Mapped[GenerationValidationStatus] = mapped_column(
        enum_column(GenerationValidationStatus)
    )
    validation_errors: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    evaluation: Mapped[Evaluation] = relationship(
        back_populates="generations", foreign_keys=[evaluation_id]
    )


class EvaluationRevision(Base):
    __tablename__ = "evaluation_revisions"

    id: Mapped[int] = mapped_column(primary_key=True)
    evaluation_id: Mapped[int] = mapped_column(ForeignKey("evaluations.id", ondelete="CASCADE"))
    criterion_result_id: Mapped[int | None] = mapped_column(
        ForeignKey("evaluation_criterion_results.id", ondelete="CASCADE"), nullable=True
    )
    field_changed: Mapped[RevisionField] = mapped_column(enum_column(RevisionField))
    previous_value: Mapped[str] = mapped_column(Text, default="")
    new_value: Mapped[str] = mapped_column(Text, default="")
    changed_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    changed_at: Mapped[datetime] = mapped_column(default=utcnow)

    evaluation: Mapped[Evaluation] = relationship(back_populates="revisions")

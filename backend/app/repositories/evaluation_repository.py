from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import EvaluationStatus
from app.models.evaluation import Evaluation


class EvaluationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, evaluation_id: int) -> Evaluation | None:
        query = (
            select(Evaluation)
            .options(
                selectinload(Evaluation.criterion_results),
                selectinload(Evaluation.generations),
                selectinload(Evaluation.revisions),
                selectinload(Evaluation.submission),
                selectinload(Evaluation.rubric),
            )
            .where(Evaluation.id == evaluation_id)
        )
        return self.db.scalars(query).unique().first()

    def list(
        self,
        status: EvaluationStatus | None = None,
        rubric_id: int | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> list[Evaluation]:
        query = select(Evaluation).options(
            selectinload(Evaluation.generations),
            selectinload(Evaluation.submission),
            selectinload(Evaluation.rubric),
        )
        if status is not None:
            query = query.where(Evaluation.status == status)
        if rubric_id is not None:
            query = query.where(Evaluation.rubric_id == rubric_id)
        if date_from is not None:
            query = query.where(Evaluation.created_at >= date_from)
        if date_to is not None:
            query = query.where(Evaluation.created_at <= date_to)
        return list(self.db.scalars(query.order_by(Evaluation.created_at.desc())).unique().all())

    def add(self, evaluation: Evaluation) -> Evaluation:
        self.db.add(evaluation)
        self.db.flush()
        return evaluation

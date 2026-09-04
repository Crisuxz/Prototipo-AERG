from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import RubricStatus
from app.models.evaluation import Evaluation
from app.models.rubric import Rubric


class RubricRepository:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self):
        return select(Rubric).options(selectinload(Rubric.criteria))

    def get(self, rubric_id: int) -> Rubric | None:
        return self.db.scalars(self._base_query().where(Rubric.id == rubric_id)).unique().first()

    def list(self, status: RubricStatus | None = None, search: str | None = None) -> list[Rubric]:
        query = self._base_query()
        if status is not None:
            query = query.where(Rubric.status == status)
        if search:
            query = query.where(Rubric.name.ilike(f"%{search}%"))
        return list(self.db.scalars(query.order_by(Rubric.updated_at.desc())).unique().all())

    def add(self, rubric: Rubric) -> Rubric:
        self.db.add(rubric)
        self.db.flush()
        return rubric

    def delete(self, rubric: Rubric) -> None:
        self.db.delete(rubric)

    def usage_count(self, rubric_id: int) -> int:
        return self.db.scalar(
            select(func.count()).select_from(Evaluation).where(Evaluation.rubric_id == rubric_id)
        ) or 0

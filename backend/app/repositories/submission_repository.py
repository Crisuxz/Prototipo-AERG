from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.submission import Submission


class SubmissionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, submission_id: int) -> Submission | None:
        return self.db.get(Submission, submission_id)

    def list(self, limit: int = 50) -> list[Submission]:
        return list(
            self.db.scalars(select(Submission).order_by(Submission.created_at.desc()).limit(limit)).all()
        )

    def add(self, submission: Submission) -> Submission:
        self.db.add(submission)
        self.db.flush()
        return submission

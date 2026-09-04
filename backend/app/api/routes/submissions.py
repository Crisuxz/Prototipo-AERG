from fastapi import APIRouter, File, Form, UploadFile, status

from app.api.deps import AppSettings, CurrentUser, DbSession
from app.models.submission import Submission
from app.schemas.submission import SubmissionResponse
from app.services.submission_service import SubmissionService

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post("", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    db: DbSession,
    settings: AppSettings,
    user: CurrentUser,
    file: UploadFile = File(...),
    student_identifier: str = Form(default="Estudiante sin identificar"),
    assignment_id: int | None = Form(default=None),
) -> Submission:
    content = await file.read()
    return SubmissionService(db, settings).create_from_upload(
        filename=file.filename or "archivo",
        content=content,
        mime_type=file.content_type,
        teacher=user,
        student_identifier=student_identifier,
        assignment_id=assignment_id,
    )


@router.get("", response_model=list[SubmissionResponse])
def list_submissions(db: DbSession, settings: AppSettings, user: CurrentUser) -> list[Submission]:
    return SubmissionService(db, settings).list()


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    submission_id: int, db: DbSession, settings: AppSettings, user: CurrentUser
) -> Submission:
    return SubmissionService(db, settings).get(submission_id)

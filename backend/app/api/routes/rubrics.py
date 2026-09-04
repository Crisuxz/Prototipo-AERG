from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, DbSession
from app.models.enums import RubricStatus
from app.models.rubric import Rubric
from app.schemas.rubric import (
    RubricCreateRequest,
    RubricListResponse,
    RubricResponse,
    RubricUpdateRequest,
)
from app.services.rubric_service import RubricService

router = APIRouter(prefix="/rubrics", tags=["rubrics"])


def _to_list_item(rubric: Rubric) -> RubricListResponse:
    return RubricListResponse(
        id=rubric.id,
        name=rubric.name,
        description=rubric.description,
        status=rubric.status,
        version=rubric.version,
        criteria_count=len(rubric.criteria),
        total_weight=sum(criterion.weight for criterion in rubric.criteria),
        updated_at=rubric.updated_at,
    )


@router.get("", response_model=list[RubricListResponse])
def list_rubrics(
    db: DbSession,
    user: CurrentUser,
    status_filter: RubricStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
) -> list[RubricListResponse]:
    rubrics = RubricService(db).list(status=status_filter, search=search)
    return [_to_list_item(rubric) for rubric in rubrics]


@router.post("", response_model=RubricResponse, status_code=status.HTTP_201_CREATED)
def create_rubric(payload: RubricCreateRequest, db: DbSession, user: CurrentUser) -> Rubric:
    return RubricService(db).create(payload, user)


@router.get("/{rubric_id}", response_model=RubricResponse)
def get_rubric(rubric_id: int, db: DbSession, user: CurrentUser) -> Rubric:
    return RubricService(db).get(rubric_id)


@router.put("/{rubric_id}", response_model=RubricResponse)
def update_rubric(
    rubric_id: int, payload: RubricUpdateRequest, db: DbSession, user: CurrentUser
) -> Rubric:
    return RubricService(db).update(rubric_id, payload)


@router.delete("/{rubric_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rubric(rubric_id: int, db: DbSession, user: CurrentUser) -> None:
    RubricService(db).delete(rubric_id)


@router.post("/{rubric_id}/publish", response_model=RubricResponse)
def publish_rubric(rubric_id: int, db: DbSession, user: CurrentUser) -> Rubric:
    return RubricService(db).publish(rubric_id)


@router.post("/{rubric_id}/archive", response_model=RubricResponse)
def archive_rubric(rubric_id: int, db: DbSession, user: CurrentUser) -> Rubric:
    return RubricService(db).archive(rubric_id)

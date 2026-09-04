from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import RubricStatus
from app.schemas.common import ApiModel


class PerformanceLevelRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    score: float = Field(ge=0)
    order: int = Field(ge=0)


class RubricCriterionRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    weight: float = Field(ge=0, le=100)
    order: int = Field(ge=0)
    levels: list[PerformanceLevelRequest] = Field(min_length=1)


class RubricCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    instructions: str | None = None
    criteria: list[RubricCriterionRequest] = Field(default_factory=list)


class RubricUpdateRequest(RubricCreateRequest):
    pass


class PerformanceLevelResponse(ApiModel):
    id: int
    name: str
    description: str | None
    score: float
    order: int


class RubricCriterionResponse(ApiModel):
    id: int
    name: str
    description: str | None
    weight: float
    order: int
    levels: list[PerformanceLevelResponse]


class RubricResponse(ApiModel):
    id: int
    name: str
    description: str | None
    instructions: str | None
    status: RubricStatus
    version: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    criteria: list[RubricCriterionResponse]


class RubricListResponse(ApiModel):
    id: int
    name: str
    description: str | None
    status: RubricStatus
    version: int
    criteria_count: int
    total_weight: float
    updated_at: datetime

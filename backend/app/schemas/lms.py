from datetime import datetime

from app.models.enums import LMSIntegrationType
from app.schemas.common import ApiModel


class LMSIntegrationResponse(ApiModel):
    id: int
    name: str
    type: LMSIntegrationType
    is_active: bool
    created_at: datetime

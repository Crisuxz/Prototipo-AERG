"""Selecciona y construye el adaptador de LMS activo (RI-01).

El prototipo opera con una unica integracion activa a la vez: el simulador (Nivel 1) o
LTI 1.3 (Nivel 2). EvaluationService solo conoce la interfaz LMSAdapter."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.integrations.lms.adapter import LMSAdapter
from app.integrations.lms.lti13_adapter import LTI13Adapter
from app.integrations.lms.simulator_adapter import SimulatorAdapter
from app.models.enums import LMSIntegrationType
from app.models.lms_integration import LMSIntegration


class LMSIntegrationService:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[LMSIntegration]:
        return list(self.db.scalars(select(LMSIntegration).order_by(LMSIntegration.id)).all())

    def get_active(self) -> LMSIntegration | None:
        return self.db.scalars(
            select(LMSIntegration)
            .where(LMSIntegration.is_active.is_(True))
            .order_by(LMSIntegration.id)
        ).first()

    def get_active_adapter(self) -> LMSAdapter | None:
        integration = self.get_active()
        if integration is None:
            return None
        return self.build_adapter(integration)

    @staticmethod
    def build_adapter(integration: LMSIntegration) -> LMSAdapter:
        if integration.type == LMSIntegrationType.LTI1_3:
            return LTI13Adapter(integration.id, integration.config)
        return SimulatorAdapter(integration.id, integration.config)

    @staticmethod
    def lti_config_from_settings(settings: Settings) -> dict:
        """Configuracion LTI tomada del .env, usada cuando la integracion no trae la suya."""
        return {
            "issuer": settings.lti_issuer,
            "client_id": settings.lti_client_id,
            "deployment_id": settings.lti_deployment_id,
            "jwks_url": settings.lti_jwks_url,
            "auth_login_url": settings.lti_auth_login_url,
        }

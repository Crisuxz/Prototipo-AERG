"""Selecciona y construye el adaptador de LMS activo (RI-01).

El prototipo opera con una unica integracion activa a la vez: el simulador (Nivel 1) o
LTI 1.3 (Nivel 2). EvaluationService solo conoce la interfaz LMSAdapter."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.integrations.lms.adapter import LMSAdapter
from app.integrations.lms.lti13_adapter import AGS_CLAIM, CLAIM_PREFIX, LTI13Adapter
from app.models.assignment import Assignment
from app.integrations.lms.simulator_adapter import SimulatorAdapter
from app.models.enums import LMSIntegrationType
from app.models.lms_integration import LMSIntegration


class LMSIntegrationService:
    def __init__(self, db: Session, settings: Settings | None = None):
        self.db = db
        self.settings = settings

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
        return self.build_adapter(integration, self.settings)

    @classmethod
    def build_adapter(cls, integration: LMSIntegration, settings: Settings | None = None) -> LMSAdapter:
        if integration.type == LMSIntegrationType.LTI1_3:
            config = cls.lti_config_from_settings(settings) if settings else {}
            config.update(integration.config or {})
            return LTI13Adapter(integration.id, config)
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
            "token_url": settings.lti_token_url,
            "private_key_path": settings.lti_tool_private_key_path,
        }

    def register_lti_launch(self, claims: dict, integration_id: int | None) -> Assignment:
        """Crea o actualiza la actividad del launch guardando su lineitem de AGS y su
        contexto (curso), para que la aprobacion envie la calificacion a esa columna."""
        resource_link = claims.get(CLAIM_PREFIX + "resource_link", {})
        context = claims.get(CLAIM_PREFIX + "context", {})
        external_id = str(resource_link.get("id") or "")
        assignment = self.db.scalars(
            select(Assignment).where(
                Assignment.external_id == external_id,
                Assignment.lti_context_id == context.get("id"),
            )
        ).first()
        if assignment is None:
            assignment = Assignment(external_id=external_id, lti_context_id=context.get("id"))
            self.db.add(assignment)
        assignment.title = resource_link.get("title") or "Actividad LTI"
        assignment.course_name = context.get("title")
        assignment.lms_integration_id = integration_id
        assignment.lti_lineitem_url = claims.get(AGS_CLAIM, {}).get("lineitem")
        self.db.commit()
        self.db.refresh(assignment)
        return assignment

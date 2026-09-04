"""Interoperabilidad con plataformas educativas (RI-01, RI-02).

Nivel 1: el simulador crea Assignment + Submission "como si" vinieran de un LMS, lo que
permite demostrar el flujo completo sin depender de una plataforma real.
Nivel 2: el par de endpoints LTI 1.3 implementa el launch OIDC. Su prueba end-to-end
contra un LMS certificado queda sujeta a disponibilidad de ese entorno."""

from fastapi import APIRouter, Form, Request, status
from fastapi.responses import RedirectResponse

from app.api.deps import AppSettings, CurrentUser, DbSession
from app.core.errors import DomainError
from app.integrations.lms.lti13_adapter import LaunchRequest, LTI13Adapter
from app.models.enums import LMSIntegrationType
from app.models.lms_integration import LMSIntegration
from app.models.submission import Submission
from app.schemas.lms import LMSIntegrationResponse
from app.schemas.submission import SimulatorSubmissionRequest, SubmissionResponse
from app.services.lms_integration_service import LMSIntegrationService
from app.services.submission_service import SubmissionService

router = APIRouter(tags=["lms"])


@router.get("/lms/integrations", response_model=list[LMSIntegrationResponse])
def list_integrations(db: DbSession, user: CurrentUser) -> list[LMSIntegration]:
    return LMSIntegrationService(db).list()


@router.post(
    "/lms/simulator/submissions",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
def simulator_submission(
    payload: SimulatorSubmissionRequest, db: DbSession, settings: AppSettings, user: CurrentUser
) -> Submission:
    service = LMSIntegrationService(db)
    integration = next(
        (item for item in service.list() if item.type == LMSIntegrationType.SIMULATOR), None
    )
    return SubmissionService(db, settings).create_from_lms_simulator(
        teacher=user,
        student_identifier=payload.student_identifier,
        content=payload.content,
        assignment_title=payload.assignment_title,
        course_name=payload.course_name,
        external_assignment_id=payload.external_assignment_id,
        lms_integration_id=integration.id if integration else None,
    )


@router.post("/lti/launch")
def lti_login_initiation(
    request: Request,
    db: DbSession,
    settings: AppSettings,
    iss: str = Form(...),
    login_hint: str = Form(...),
    target_link_uri: str = Form(...),
    lti_message_hint: str | None = Form(default=None),
    client_id: str | None = Form(default=None),
    lti_deployment_id: str | None = Form(default=None),
) -> RedirectResponse:
    """Paso 1 del launch OIDC: la plataforma inicia el login y el tool redirige a su
    endpoint de autorizacion. El `id_token` firmado regresa despues a /api/lti/callback."""
    config = _lti_config(db, settings)
    if not config.get("auth_login_url"):
        raise DomainError(
            "LTI_NOT_CONFIGURED",
            "No hay una integracion LTI 1.3 configurada en este despliegue.",
            409,
        )
    if config.get("issuer") and iss != config["issuer"]:
        raise DomainError("FORBIDDEN", "El emisor no corresponde a la integracion LTI.", 403)

    adapter = LTI13Adapter(None, config)
    redirect_uri = str(request.url_for("lti_callback"))
    location = adapter.build_login_redirect(
        LaunchRequest(
            iss=iss,
            login_hint=login_hint,
            target_link_uri=target_link_uri,
            lti_message_hint=lti_message_hint,
            client_id=client_id,
            lti_deployment_id=lti_deployment_id,
        ),
        redirect_uri,
    )
    return RedirectResponse(location, status_code=status.HTTP_302_FOUND)


@router.post("/lti/callback", name="lti_callback")
def lti_callback(
    db: DbSession, settings: AppSettings, id_token: str = Form(...), state: str = Form(default="")
) -> dict:
    """Paso 2: valida la firma y los claims del `id_token` emitido por la plataforma."""
    config = _lti_config(db, settings)
    try:
        claims = LTI13Adapter(None, config).validate_id_token(id_token)
    except Exception as exc:
        raise DomainError("UNAUTHORIZED", "El id_token de LTI no es valido.", 401) from exc
    return {"status": "ok", "claims": claims, "state": state}


def _lti_config(db: DbSession, settings: AppSettings) -> dict:
    service = LMSIntegrationService(db)
    integration = next(
        (item for item in service.list() if item.type == LMSIntegrationType.LTI1_3), None
    )
    config = LMSIntegrationService.lti_config_from_settings(settings)
    if integration:
        config.update(integration.config or {})
    return config

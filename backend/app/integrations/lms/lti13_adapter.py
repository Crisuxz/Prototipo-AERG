"""Adaptador de Nivel 2: LTI 1.3 (launch OIDC + Assignment and Grade Services).

Alcance implementado: la mecanica del protocolo (redireccion de login OIDC, validacion
del `id_token` firmado por la plataforma contra su JWKS, lectura de los claims LTI, y
envio de la calificacion como Score de AGS). Su prueba end-to-end contra un LMS
certificado depende de disponibilidad de ese entorno y se declara como limitacion en el
capitulo metodologico (OBSERVACION / RIESGO 4 del plan)."""

import secrets
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import httpx
import jwt
from jwt import PyJWKClient

from app.integrations.lms.adapter import LMSAdapter, LMSSendResult

CLAIM_PREFIX = "https://purl.imsglobal.org/spec/lti/claim/"
AGS_CLAIM = "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"
SCORE_SCOPE = "https://purl.imsglobal.org/spec/lti-ags/scope/score"


@dataclass
class LaunchRequest:
    iss: str
    login_hint: str
    target_link_uri: str
    lti_message_hint: str | None = None
    client_id: str | None = None
    lti_deployment_id: str | None = None


class LTI13Adapter(LMSAdapter):
    """`config` esperado: issuer, client_id, deployment_id, jwks_url, auth_login_url,
    y opcionalmente access_token (obtenido por client_credentials fuera de este prototipo)."""

    def build_login_redirect(self, request: LaunchRequest, redirect_uri: str) -> str:
        """Paso 1 del launch OIDC: la plataforma inicia el login y el tool responde con
        una redireccion al endpoint de autorizacion incluyendo `state` y `nonce`."""
        params = {
            "scope": "openid",
            "response_type": "id_token",
            "response_mode": "form_post",
            "prompt": "none",
            "client_id": request.client_id or self.config.get("client_id", ""),
            "redirect_uri": redirect_uri,
            "login_hint": request.login_hint,
            "state": secrets.token_urlsafe(32),
            "nonce": secrets.token_urlsafe(32),
        }
        if request.lti_message_hint:
            params["lti_message_hint"] = request.lti_message_hint
        return self.config.get("auth_login_url", "") + "?" + urlencode(params)

    def validate_id_token(self, id_token: str) -> dict[str, Any]:
        """Paso 2: valida la firma del `id_token` contra el JWKS de la plataforma y
        comprueba los claims LTI obligatorios."""
        signing_key = PyJWKClient(self.config["jwks_url"]).get_signing_key_from_jwt(id_token)
        claims = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=self.config["client_id"],
            issuer=self.config["issuer"],
        )
        deployment_id = claims.get(CLAIM_PREFIX + "deployment_id")
        if deployment_id != self.config.get("deployment_id"):
            raise ValueError("El deployment_id del id_token no corresponde a esta integracion.")
        if claims.get(CLAIM_PREFIX + "message_type") != "LtiResourceLinkRequest":
            raise ValueError("Tipo de mensaje LTI no soportado por el prototipo.")
        return claims

    def send_result(self, evaluation) -> LMSSendResult:
        """Paso 3: publica la calificacion como Score de AGS sobre la lineitem del launch."""
        payload = self.build_payload(evaluation)
        payload["transport"] = "LTI1_3_AGS"
        payload["integration_id"] = self.integration_id

        lineitem_url = self.config.get("lineitem_url")
        access_token = self.config.get("access_token")
        if not lineitem_url or not access_token:
            return LMSSendResult(
                success=False,
                payload=payload,
                error_message=(
                    "La integracion LTI 1.3 no tiene lineitem_url o access_token configurados; "
                    "no se envio la calificacion."
                ),
            )

        score = {
            "userId": payload["student_identifier"],
            "scoreGiven": payload["score_given"],
            "scoreMaximum": payload["score_maximum"],
            "comment": payload["comment"],
            "activityProgress": "Completed",
            "gradingProgress": "FullyGraded",
            "timestamp": payload["approved_at"],
        }
        payload["ags_score"] = score

        try:
            response = httpx.post(
                lineitem_url.rstrip("/") + "/scores",
                json=score,
                headers={
                    "Authorization": "Bearer " + access_token,
                    "Content-Type": "application/vnd.ims.lis.v1.score+json",
                },
                timeout=15,
            )
            response.raise_for_status()
        except httpx.HTTPError:
            return LMSSendResult(
                success=False,
                payload=payload,
                error_message="El LMS rechazo el envio de la calificacion via AGS.",
            )

        return LMSSendResult(success=True, payload=payload)

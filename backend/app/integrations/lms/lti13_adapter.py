"""Adaptador de Nivel 2: LTI 1.3 (launch OIDC + Assignment and Grade Services).

Alcance implementado: la mecanica del protocolo (redireccion de login OIDC, validacion
del `id_token` firmado por la plataforma contra su JWKS, lectura de los claims LTI, y
envio de la calificacion como Score de AGS). Su prueba end-to-end contra un LMS
certificado depende de disponibilidad de ese entorno y se declara como limitacion en el
capitulo metodologico (OBSERVACION / RIESGO 4 del plan)."""

import hashlib
import json
import secrets
import time
import uuid
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import httpx
import jwt
from cryptography.hazmat.primitives import serialization
from jwt import PyJWKClient
from jwt.algorithms import RSAAlgorithm

from app.integrations.lms.adapter import LMSAdapter, LMSSendResult

CLAIM_PREFIX = "https://purl.imsglobal.org/spec/lti/claim/"
AGS_CLAIM = "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"
SCORE_SCOPE = "https://purl.imsglobal.org/spec/lti-ags/scope/score"
LINEITEM_SCOPE = "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem"
CLIENT_ASSERTION_TYPE = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"

# Cache de access_tokens de AGS por (token_url, client_id): (token, expira_en_epoch).
_token_cache: dict[tuple[str, str], tuple[str, float]] = {}


@lru_cache
def load_private_key(path: str):
    return serialization.load_pem_private_key(Path(path).read_bytes(), password=None)


def _public_jwk(private_key_path: str) -> dict[str, Any]:
    return json.loads(RSAAlgorithm.to_jwk(load_private_key(private_key_path).public_key()))


def key_id(private_key_path: str) -> str:
    """kid estable derivado de la clave publica (huella RFC 7638)."""
    jwk = _public_jwk(private_key_path)
    canonical = json.dumps({"e": jwk["e"], "kty": "RSA", "n": jwk["n"]}, separators=(",", ":"))
    return jwt.utils.base64url_encode(hashlib.sha256(canonical.encode()).digest()).decode()


def tool_jwks(private_key_path: str) -> dict[str, Any]:
    """JWKS publico de la herramienta: la plataforma lo usa para verificar la
    client_assertion con la que el tool pide su access_token de AGS."""
    jwk = _public_jwk(private_key_path)
    jwk.update({"kid": key_id(private_key_path), "alg": "RS256", "use": "sig"})
    return {"keys": [jwk]}


@dataclass
class LaunchRequest:
    iss: str
    login_hint: str
    target_link_uri: str
    lti_message_hint: str | None = None
    client_id: str | None = None
    lti_deployment_id: str | None = None


class LTI13Adapter(LMSAdapter):
    """`config` esperado: issuer, client_id, deployment_id, jwks_url, auth_login_url y,
    para AGS, token_url y private_key_path (la llave privada de la herramienta)."""

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

        assignment = evaluation.submission.assignment
        lineitem_url = (assignment.lti_lineitem_url if assignment else None) or self.config.get(
            "lineitem_url"
        )
        if not lineitem_url or not self.config.get("token_url") or not self.config.get(
            "private_key_path"
        ):
            return LMSSendResult(
                success=False,
                payload=payload,
                error_message=(
                    "La integracion LTI 1.3 no tiene lineitem, token_url o llave de la "
                    "herramienta configurados; no se envio la calificacion."
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
            access_token = self.get_access_token()
            response = httpx.post(
                _scores_url(lineitem_url),
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

    def get_access_token(self) -> str:
        """OAuth2 client_credentials con client_assertion JWT firmada por la herramienta
        (LTI Security Framework). El token se reutiliza hasta poco antes de expirar."""
        token_url = self.config["token_url"]
        client_id = self.config["client_id"]
        cached = _token_cache.get((token_url, client_id))
        if cached and cached[1] > time.time():
            return cached[0]

        key_path = self.config["private_key_path"]
        now = int(time.time())
        assertion = jwt.encode(
            {
                "iss": client_id,
                "sub": client_id,
                "aud": token_url,
                "iat": now,
                "exp": now + 300,
                "jti": str(uuid.uuid4()),
            },
            load_private_key(key_path),
            algorithm="RS256",
            headers={"kid": key_id(key_path)},
        )
        response = httpx.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_assertion_type": CLIENT_ASSERTION_TYPE,
                "client_assertion": assertion,
                "scope": SCORE_SCOPE + " " + LINEITEM_SCOPE,
            },
            timeout=15,
        )
        response.raise_for_status()
        body = response.json()
        token = body["access_token"]
        # Margen de 60 s para no usar un token que expire en pleno envio.
        _token_cache[(token_url, client_id)] = (token, now + int(body.get("expires_in", 3600)) - 60)
        return token


def _scores_url(lineitem_url: str) -> str:
    """El endpoint de scores es `<lineitem>/scores`, conservando la query (Moodle
    usa `.../lineitem?type_id=N`)."""
    base, _, query = lineitem_url.partition("?")
    return base.rstrip("/") + "/scores" + ("?" + query if query else "")

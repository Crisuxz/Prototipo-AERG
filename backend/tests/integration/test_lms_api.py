"""Integracion con LMS: simulador end-to-end y validacion de id_token LTI 1.3 (Parte 99)."""

import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.integrations.lms import lti13_adapter
from app.integrations.lms.lti13_adapter import LaunchRequest, LTI13Adapter

LTI_CONFIG = {
    "issuer": "https://lms.example.edu",
    "client_id": "cliente-prototipo",
    "deployment_id": "despliegue-1",
    "jwks_url": "https://lms.example.edu/jwks",
    "auth_login_url": "https://lms.example.edu/auth",
}


@pytest.fixture(scope="module")
def rsa_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def id_token(rsa_key, **overrides) -> str:
    claims = {
        "iss": LTI_CONFIG["issuer"],
        "aud": LTI_CONFIG["client_id"],
        "sub": "usuario-lms-1",
        "exp": int(time.time()) + 300,
        "iat": int(time.time()),
        "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
        "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
        "https://purl.imsglobal.org/spec/lti/claim/deployment_id": LTI_CONFIG["deployment_id"],
    }
    claims.update(overrides)
    return jwt.encode(claims, rsa_key, algorithm="RS256", headers={"kid": "clave-de-prueba"})


class FakeJWKClient:
    """Sustituye la descarga del JWKS remoto por la clave publica local de la prueba."""

    public_key = None

    def __init__(self, url: str):
        self.url = url

    def get_signing_key_from_jwt(self, token: str):
        return type("SigningKey", (), {"key": FakeJWKClient.public_key})()


def adapter_with_local_key(rsa_key, monkeypatch) -> LTI13Adapter:
    FakeJWKClient.public_key = rsa_key.public_key()
    monkeypatch.setattr(lti13_adapter, "PyJWKClient", FakeJWKClient)
    return LTI13Adapter(None, LTI_CONFIG)


# ------------------------------------------------------------------ simulador


def test_el_simulador_crea_un_trabajo_evaluable(client):
    response = client.post(
        "/api/lms/simulator/submissions",
        json={
            "student_identifier": "Estudiante simulado",
            "content": "Texto del trabajo entregado desde el LMS simulado.",
            "assignment_title": "Ensayo argumentativo",
            "course_name": "Comunicacion oral y escrita",
            "external_assignment_id": "tarea-101",
        },
    )
    assert response.status_code == 201
    body = response.json()
    # La entrega simulada queda vinculada a un Assignment creado por el adaptador.
    assert body["assignment_id"] is not None
    assert body["extraction_status"] == "SUCCESS"
    assert "LMS simulado" in body["extracted_text"]


def test_las_integraciones_incluyen_el_simulador_activo(client):
    integrations = client.get("/api/lms/integrations").json()
    assert integrations[0]["type"] == "SIMULATOR"
    assert integrations[0]["is_active"] is True


# ----------------------------------------------------------------------- LTI


def test_el_launch_redirige_al_endpoint_de_autorizacion(client, db_session):
    from app.models.enums import LMSIntegrationType
    from app.models.lms_integration import LMSIntegration

    db_session.add(
        LMSIntegration(
            name="LMS certificado",
            type=LMSIntegrationType.LTI1_3,
            config=LTI_CONFIG,
            is_active=False,
        )
    )
    db_session.commit()

    response = client.post(
        "/api/lti/launch",
        data={
            "iss": LTI_CONFIG["issuer"],
            "login_hint": "usuario-lms-1",
            "target_link_uri": "http://testserver/api/lti/callback",
        },
        follow_redirects=False,
    )
    assert response.status_code == 302
    location = response.headers["location"]
    assert location.startswith(LTI_CONFIG["auth_login_url"])
    assert "client_id=cliente-prototipo" in location
    assert "response_type=id_token" in location
    assert "scope=openid" in location


def test_el_launch_sin_integracion_configurada_es_rechazado(client):
    response = client.post(
        "/api/lti/launch",
        data={
            "iss": LTI_CONFIG["issuer"],
            "login_hint": "usuario-lms-1",
            "target_link_uri": "http://testserver/api/lti/callback",
        },
        follow_redirects=False,
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "LTI_NOT_CONFIGURED"


def test_id_token_valido_es_aceptado(rsa_key, monkeypatch):
    adapter = adapter_with_local_key(rsa_key, monkeypatch)
    claims = adapter.validate_id_token(id_token(rsa_key))
    assert claims["sub"] == "usuario-lms-1"


def test_id_token_con_firma_ajena_es_rechazado(rsa_key, monkeypatch):
    otra_clave = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    adapter = adapter_with_local_key(rsa_key, monkeypatch)
    with pytest.raises(Exception):
        adapter.validate_id_token(id_token(otra_clave))


def test_id_token_de_otro_despliegue_es_rechazado(rsa_key, monkeypatch):
    adapter = adapter_with_local_key(rsa_key, monkeypatch)
    token = id_token(
        rsa_key,
        **{"https://purl.imsglobal.org/spec/lti/claim/deployment_id": "despliegue-ajeno"},
    )
    with pytest.raises(Exception):
        adapter.validate_id_token(token)


def test_id_token_expirado_es_rechazado(rsa_key, monkeypatch):
    adapter = adapter_with_local_key(rsa_key, monkeypatch)
    with pytest.raises(Exception):
        adapter.validate_id_token(id_token(rsa_key, exp=int(time.time()) - 10))


def test_el_callback_rechaza_un_id_token_invalido(client, db_session):
    from app.models.enums import LMSIntegrationType
    from app.models.lms_integration import LMSIntegration

    db_session.add(
        LMSIntegration(
            name="LMS certificado", type=LMSIntegrationType.LTI1_3, config=LTI_CONFIG, is_active=False
        )
    )
    db_session.commit()

    response = client.post("/api/lti/callback", data={"id_token": "token.no.valido"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_el_launch_construye_la_url_con_los_parametros_obligatorios():
    adapter = LTI13Adapter(None, LTI_CONFIG)
    location = adapter.build_login_redirect(
        LaunchRequest(
            iss=LTI_CONFIG["issuer"],
            login_hint="usuario-lms-1",
            target_link_uri="http://testserver/api/lti/callback",
            lti_message_hint="mensaje",
        ),
        "http://testserver/api/lti/callback",
    )
    for parameter in ("response_mode=form_post", "prompt=none", "nonce=", "state=", "login_hint="):
        assert parameter in location

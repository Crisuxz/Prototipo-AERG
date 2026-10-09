"""LTI 1.3 Assignment and Grade Services: JWKS de la herramienta, access_token por
client_credentials y envio del Score, con httpx simulado (RI-01, RI-06, RF-20)."""

import time
from types import SimpleNamespace

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.integrations.lms import lti13_adapter
from app.integrations.lms.lti13_adapter import LTI13Adapter, tool_jwks

TOKEN_URL = "https://lms.example.edu/mod/lti/token.php"
LINEITEM = "https://lms.example.edu/mod/lti/services.php/2/lineitems/7/lineitem?type_id=1"


@pytest.fixture
def key_path(tmp_path):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    path = tmp_path / "tool_private.pem"
    path.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    lti13_adapter._token_cache.clear()
    return str(path)


def evaluation(lineitem: str | None = LINEITEM):
    assignment = SimpleNamespace(external_id="enlace-1", lti_lineitem_url=lineitem)
    submission = SimpleNamespace(student_identifier="lti-alumno-3", assignment=assignment)
    return SimpleNamespace(
        id=10,
        submission_id=5,
        submission=submission,
        final_total_score=85.0,
        final_max_score=100.0,
        general_feedback="Buen trabajo.",
        criterion_results=[],
        approved_at=None,
    )


def adapter(key_path: str, **overrides) -> LTI13Adapter:
    config = {"client_id": "cliente-aerg", "token_url": TOKEN_URL, "private_key_path": key_path}
    config.update(overrides)
    return LTI13Adapter(3, config)


class FakeHttp:
    """Sustituye httpx.post: registra las llamadas y responde segun la URL."""

    def __init__(self, score_status: int = 200, token_status: int = 200):
        self.calls: list[dict] = []
        self.score_status = score_status
        self.token_status = token_status

    def __call__(self, url, **kwargs):
        self.calls.append({"url": url, **kwargs})
        request = httpx.Request("POST", url)
        if url == TOKEN_URL:
            return httpx.Response(
                self.token_status,
                json={"access_token": "token-ags", "token_type": "Bearer", "expires_in": 3600},
                request=request,
            )
        return httpx.Response(self.score_status, json={}, request=request)


def test_el_jwks_expone_la_llave_publica_de_la_herramienta(key_path):
    jwks = tool_jwks(key_path)
    key = jwks["keys"][0]
    assert key["kty"] == "RSA" and key["alg"] == "RS256" and key["use"] == "sig"
    assert key["kid"]
    assert "d" not in key  # nunca la parte privada


def test_el_endpoint_jwks(client, settings, key_path):
    assert client.get("/api/lti/jwks").status_code == 409
    settings.lti_tool_private_key_path = key_path
    del client.headers["Authorization"]  # la plataforma lo consulta sin token
    response = client.get("/api/lti/jwks")
    assert response.status_code == 200
    assert response.json() == tool_jwks(key_path)


def test_envio_correcto_obtiene_token_y_publica_el_score(key_path, monkeypatch):
    fake = FakeHttp()
    monkeypatch.setattr(lti13_adapter.httpx, "post", fake)

    result = adapter(key_path).send_result(evaluation())

    assert result.success is True
    token_call, score_call = fake.calls
    assert token_call["url"] == TOKEN_URL
    assert token_call["data"]["grant_type"] == "client_credentials"
    assert token_call["data"]["scope"] == (
        "https://purl.imsglobal.org/spec/lti-ags/scope/score "
        "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem"
    )
    # La client_assertion va firmada con la llave de la herramienta y verifica con su JWKS.
    public = jwt.PyJWK(tool_jwks(key_path)["keys"][0]).key
    assertion = jwt.decode(
        token_call["data"]["client_assertion"], public, algorithms=["RS256"], audience=TOKEN_URL
    )
    assert assertion["iss"] == assertion["sub"] == "cliente-aerg"

    assert score_call["url"] == (
        "https://lms.example.edu/mod/lti/services.php/2/lineitems/7/lineitem/scores?type_id=1"
    )
    assert score_call["headers"]["Authorization"] == "Bearer token-ags"
    assert score_call["headers"]["Content-Type"] == "application/vnd.ims.lis.v1.score+json"
    assert score_call["json"]["userId"] == "lti-alumno-3"
    assert score_call["json"]["scoreGiven"] == 85.0
    assert score_call["json"]["scoreMaximum"] == 100.0


def test_el_access_token_se_reutiliza_hasta_que_expira(key_path, monkeypatch):
    fake = FakeHttp()
    monkeypatch.setattr(lti13_adapter.httpx, "post", fake)
    tool = adapter(key_path)

    tool.send_result(evaluation())
    tool.send_result(evaluation())
    assert [call["url"] for call in fake.calls].count(TOKEN_URL) == 1

    # Si el token cacheado ya expiro, se pide uno nuevo.
    key = (TOKEN_URL, "cliente-aerg")
    lti13_adapter._token_cache[key] = ("viejo", time.time() - 1)
    tool.send_result(evaluation())
    assert [call["url"] for call in fake.calls].count(TOKEN_URL) == 2


@pytest.mark.parametrize(
    "missing", [{"token_url": ""}, {"private_key_path": ""}, {"lineitem": None}]
)
def test_configuracion_faltante_no_llama_al_lms(key_path, monkeypatch, missing):
    fake = FakeHttp()
    monkeypatch.setattr(lti13_adapter.httpx, "post", fake)
    lineitem = missing.pop("lineitem", LINEITEM)

    result = adapter(key_path, **missing).send_result(evaluation(lineitem))

    assert result.success is False
    assert "no se envio la calificacion" in result.error_message
    assert fake.calls == []


@pytest.mark.parametrize("status_code", [400, 401, 403, 500, 503])
def test_el_lms_rechaza_el_score(key_path, monkeypatch, status_code):
    monkeypatch.setattr(lti13_adapter.httpx, "post", FakeHttp(score_status=status_code))
    result = adapter(key_path).send_result(evaluation())
    assert result.success is False
    assert result.error_message == "El LMS rechazo el envio de la calificacion via AGS."


@pytest.mark.parametrize("status_code", [400, 401, 500])
def test_falla_la_obtencion_del_token(key_path, monkeypatch, status_code):
    fake = FakeHttp(token_status=status_code)
    monkeypatch.setattr(lti13_adapter.httpx, "post", fake)
    result = adapter(key_path).send_result(evaluation())
    assert result.success is False
    assert len(fake.calls) == 1  # sin token no se intenta publicar el score


def test_el_launch_guarda_lineitem_y_contexto_en_la_actividad(db_session):
    from app.services.lms_integration_service import LMSIntegrationService

    claims = {
        "https://purl.imsglobal.org/spec/lti/claim/resource_link": {"id": "rl-9", "title": "Ensayo"},
        "https://purl.imsglobal.org/spec/lti/claim/context": {"id": "curso-4", "title": "Redaccion"},
        "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint": {"lineitem": LINEITEM},
    }
    service = LMSIntegrationService(db_session)
    first = service.register_lti_launch(claims, None)
    assert first.lti_lineitem_url == LINEITEM
    assert first.lti_context_id == "curso-4"
    assert first.external_id == "rl-9"
    assert first.course_name == "Redaccion"
    # Un segundo launch de la misma actividad reutiliza el registro.
    assert service.register_lti_launch(claims, None).id == first.id

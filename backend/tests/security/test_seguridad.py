"""Pruebas de seguridad y de acceso no autenticado (Partes 95 y 96)."""

import os

from fastapi.testclient import TestClient

from app.api.deps import get_gemini_service
from app.core.config import get_settings
from app.db.session import get_db
from app.main import app
from app.services.document_processing_service import sanitize_filename

PROTECTED_ENDPOINTS = [
    ("get", "/api/rubrics"),
    ("post", "/api/rubrics"),
    ("get", "/api/submissions/1"),
    ("get", "/api/evaluations"),
    ("post", "/api/evaluations"),
    ("get", "/api/incidents"),
    ("get", "/api/lms/integrations"),
]


def test_los_endpoints_protegidos_rechazan_peticiones_sin_token(client):
    del client.headers["Authorization"]
    for method, path in PROTECTED_ENDPOINTS:
        response = client.request(method, path, json={})
        assert response.status_code == 401, path
        assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_un_token_incorrecto_es_rechazado(client):
    response = client.get("/api/rubrics", headers={"Authorization": "Bearer token-ajeno"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_un_esquema_de_autorizacion_distinto_es_rechazado(client):
    response = client.get("/api/rubrics", headers={"Authorization": "Basic dGVzdDp0ZXN0"})
    assert response.status_code == 401


def test_el_health_check_es_publico(client):
    del client.headers["Authorization"]
    assert client.get("/api/health").status_code == 200


def test_los_nombres_de_archivo_con_path_traversal_se_sanean():
    assert sanitize_filename("../../etc/passwd") == "etc_passwd" or "/" not in sanitize_filename(
        "../../etc/passwd"
    )
    assert sanitize_filename("..\\..\\windows\\system32\\config") == "config"
    assert "/" not in sanitize_filename("../../etc/passwd.txt")
    assert not sanitize_filename("../../etc/passwd.txt").startswith(".")


def test_el_archivo_se_guarda_fuera_del_alcance_del_nombre_original(client, settings):
    response = client.post(
        "/api/submissions",
        files={"file": ("../../etc/passwd.txt", b"contenido del trabajo", "text/plain")},
        data={"student_identifier": "Estudiante 1"},
    )
    assert response.status_code == 201
    assert "/" not in response.json()["original_filename"]
    assert ".." not in response.json()["original_filename"]

    # Todo lo escrito queda dentro de UPLOAD_DIR, con un nombre generado por el backend.
    stored = os.listdir(settings.upload_dir)
    assert len(stored) == 1
    assert stored[0].endswith(".txt")
    assert "passwd" not in stored[0]


def test_el_limite_de_tamanio_se_aplica_antes_de_procesar(client, settings):
    exceso = b"a" * (settings.max_upload_mb * 1024 * 1024 + 1)
    response = client.post(
        "/api/submissions",
        files={"file": ("grande.txt", exceso, "text/plain")},
        data={"student_identifier": "Estudiante 1"},
    )
    assert response.status_code == 413
    assert not os.path.isdir(settings.upload_dir) or os.listdir(settings.upload_dir) == []


def test_la_api_key_de_gemini_nunca_aparece_en_las_respuestas(client, settings, published_rubric):
    cuerpos = [
        client.get("/api/health").text,
        client.get("/api/rubrics").text,
        client.get("/api/incidents").text,
        client.get("/api/lms/integrations").text,
        client.get("/openapi.json").text,
    ]
    for cuerpo in cuerpos:
        assert settings.gemini_api_key not in cuerpo
        assert "gemini_api_key" not in cuerpo


def test_las_incidencias_redactan_los_valores_sensibles(client, db_session):
    from app.models.enums import IncidentEntityType, IncidentSeverity, IncidentType
    from app.services.incident_service import IncidentService

    IncidentService(db_session).record(
        IncidentEntityType.EVALUATION,
        1,
        IncidentType.GEMINI_HTTP_ERROR,
        IncidentSeverity.ERROR,
        "Fallo la llamada.",
        {"api_key": "clave-secreta-real", "modelo": "gemini-test"},
    )
    db_session.commit()

    incidencia = client.get("/api/incidents").json()[0]
    assert "clave-secreta-real" not in client.get("/api/incidents").text
    assert incidencia["details"]["api_key"] == "[REDACTED]"
    assert incidencia["details"]["modelo"] == "gemini-test"


def test_cors_solo_permite_los_origenes_configurados(client):
    permitido = get_settings().cors_origins_list[0]
    response = client.get("/api/health", headers={"Origin": permitido})
    assert response.headers.get("access-control-allow-origin") == permitido

    ajeno = client.get("/api/health", headers={"Origin": "http://sitio-no-autorizado.example"})
    assert ajeno.headers.get("access-control-allow-origin") is None


def test_un_error_no_controlado_no_expone_el_traceback(db_session, settings):
    class GeminiQueRevienta:
        model_name = "gemini-test"

        def evaluate(self, context):
            raise RuntimeError("detalle interno con /rutas/secretas y credenciales")

    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_gemini_service] = lambda: GeminiQueRevienta()
    try:
        # `raise_server_exceptions=False` deja que el manejador global produzca la respuesta,
        # que es justamente lo que se quiere verificar.
        with TestClient(app, raise_server_exceptions=False) as cliente:
            cliente.headers.update({"Authorization": "Bearer test-token"})
            rubrica = cliente.post(
                "/api/rubrics",
                json={
                    "name": "Rubrica",
                    "description": None,
                    "instructions": None,
                    "criteria": [
                        {
                            "name": "Criterio",
                            "description": None,
                            "weight": 100,
                            "order": 1,
                            "levels": [{"name": "Alto", "description": None, "score": 4, "order": 1}],
                        }
                    ],
                },
            ).json()
            cliente.post("/api/rubrics/" + str(rubrica["id"]) + "/publish")
            trabajo = cliente.post(
                "/api/submissions",
                files={"file": ("ensayo.txt", b"Texto del trabajo.", "text/plain")},
                data={"student_identifier": "Estudiante 1"},
            ).json()

            response = cliente.post(
                "/api/evaluations",
                json={"submission_id": trabajo["id"], "rubric_id": rubrica["id"]},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 500
    assert response.json() == {
        "error": {"code": "INTERNAL_ERROR", "message": "Ocurrio un error interno inesperado."}
    }
    assert "Traceback" not in response.text
    assert "rutas/secretas" not in response.text

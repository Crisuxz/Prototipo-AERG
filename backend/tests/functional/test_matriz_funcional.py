"""Matriz funcional TF-01 a TF-11 (Parte 94): un test por fila, con el mismo identificador
que la matriz para poder citarla en el capitulo de resultados de la tesis."""

from app.models.enums import GenerationValidationStatus
from tests.conftest import ai_criterion, failed_result, valid_result


def criteria_for(rubric: dict, level: str = "Excelente", score: float = 4) -> list[dict]:
    return [
        ai_criterion(criterion["id"], criterion["name"], level, score)
        for criterion in rubric["criteria"]
    ]


def evaluate(client, submission: dict, rubric: dict):
    return client.post(
        "/api/evaluations",
        json={"submission_id": submission["id"], "rubric_id": rubric["id"]},
    )


def test_tf01_rf01_crear_y_publicar_rubrica_de_tres_criterios(client, rubric_payload):
    created = client.post("/api/rubrics", json=rubric_payload).json()
    assert [criterion["weight"] for criterion in created["criteria"]] == [40.0, 30.0, 30.0]
    published = client.post("/api/rubrics/" + str(created["id"]) + "/publish").json()
    assert published["status"] == "PUBLISHED"


def test_tf02_rf02_publicar_con_pesos_que_suman_90_es_rechazado(client, rubric_payload):
    rubric_payload["criteria"][0]["weight"] = 30
    created = client.post("/api/rubrics", json=rubric_payload).json()
    response = client.post("/api/rubrics/" + str(created["id"]) + "/publish")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_RUBRIC"


def test_tf03_rf04_rf05_subir_un_ejecutable_es_rechazado(client):
    response = client.post(
        "/api/submissions",
        files={"file": ("virus.exe", b"MZ", "application/octet-stream")},
        data={"student_identifier": "Estudiante 1"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_FILE_TYPE"


def test_tf04_rf06_a_rf09_evaluacion_generada_con_los_criterios_de_la_rubrica(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric))]
    body = evaluate(client, submission, published_rubric).json()
    assert body["status"] == "AI_GENERATED"
    esperados = [criterion["id"] for criterion in published_rubric["criteria"]]
    assert [result["criterion_id"] for result in body["criterion_results"]] == esperados
    assert all(result["ai_feedback"] for result in body["criterion_results"])


def test_tf05_rf10_score_fuera_de_rango_se_rechaza_y_deja_incidencia(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric, "Excelente", 99))]
    response = evaluate(client, submission, published_rubric)
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "INVALID_AI_RESPONSE"
    incidents = client.get("/api/incidents").json()
    assert any(item["incident_type"] == "INVALID_AI_RESPONSE" for item in incidents)


def test_tf06_rf14_rf15_revisar_crea_revision_y_deja_en_under_review(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric))]
    created = evaluate(client, submission, published_rubric).json()
    criterion_id = created["criterion_results"][0]["criterion_id"]

    reviewed = client.put(
        "/api/evaluations/" + str(created["id"]) + "/review",
        json={
            "criteria": [
                {
                    "criterion_id": criterion_id,
                    "final_score": 2,
                    "final_feedback": "Ajuste del docente.",
                }
            ]
        },
    ).json()
    assert reviewed["status"] == "UNDER_REVIEW"

    detail = client.get("/api/evaluations/" + str(created["id"])).json()
    assert len(detail["revisions"]) == 2
    assert detail["revisions"][0]["changed_by"] == 1


def test_tf07_rf16_regenerar_conserva_la_generacion_anterior(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [
        valid_result(criteria_for(published_rubric, "Suficiente", 2)),
        valid_result(criteria_for(published_rubric, "Excelente", 4)),
    ]
    created = evaluate(client, submission, published_rubric).json()
    client.put(
        "/api/evaluations/" + str(created["id"]) + "/review",
        json={"general_feedback": "Comentario previo."},
    )
    client.post("/api/evaluations/" + str(created["id"]) + "/regenerate", json={})

    detail = client.get("/api/evaluations/" + str(created["id"])).json()
    assert [item["generation_number"] for item in detail["generations"]] == [1, 2]
    assert detail["current_generation_id"] == detail["generations"][1]["id"]


def test_tf08_rf17_aprobar_calcula_el_total_y_congela_la_evaluacion(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric, "Suficiente", 2))]
    created = evaluate(client, submission, published_rubric).json()
    client.put("/api/evaluations/" + str(created["id"]) + "/review", json={"criteria": []})

    approved = client.post("/api/evaluations/" + str(created["id"]) + "/approve").json()
    assert approved["status"] == "APPROVED"
    assert approved["final_total_score"] == 50.0
    assert approved["final_max_score"] == 100.0


def test_tf09_rf18_rf19_el_detalle_reconstruye_la_trazabilidad(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric))]
    created = evaluate(client, submission, published_rubric).json()
    client.put(
        "/api/evaluations/" + str(created["id"]) + "/review",
        json={"general_feedback": "Comentario del docente."},
    )
    client.post("/api/evaluations/" + str(created["id"]) + "/approve")

    detail = client.get("/api/evaluations/" + str(created["id"])).json()
    assert detail["rubric_version_snapshot"]["criteria"]
    assert detail["generations"]
    assert detail["revisions"]
    assert detail["submission"]["extracted_text"]


def test_tf10_rf20_el_simulador_recibe_el_resultado_aprobado(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric))]
    created = evaluate(client, submission, published_rubric).json()
    approved = client.post("/api/evaluations/" + str(created["id"]) + "/approve").json()

    assert approved["sent_to_lms_at"] is not None
    payload = client.get("/api/evaluations/" + str(created["id"])).json()["lms_result_payload"]
    assert payload["transport"] == "SIMULATOR"
    assert payload["score_given"] == 100.0
    assert payload["student_identifier"] == "Estudiante 1"
    assert len(payload["criteria"]) == 3


def test_tf11_rf21_un_fallo_de_gemini_registra_una_incidencia(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [
        failed_result(GenerationValidationStatus.HTTP_ERROR, "Servicio no disponible.")
    ]
    evaluate(client, submission, published_rubric)

    incidents = client.get("/api/incidents").json()
    assert incidents
    assert incidents[0]["incident_type"] == "GEMINI_HTTP_ERROR"
    assert incidents[0]["severity"] == "ERROR"
    assert incidents[0]["related_entity_type"] == "EVALUATION"

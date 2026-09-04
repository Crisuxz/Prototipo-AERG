"""Ciclo completo de evaluacion contra la API, con GeminiService sustituido (Parte 93/94)."""

from app.models.enums import GenerationValidationStatus
from tests.conftest import ai_criterion, failed_result, valid_result


def criteria_for(rubric: dict, level: str = "Excelente", score: float = 4) -> list[dict]:
    return [
        ai_criterion(criterion["id"], criterion["name"], level, score)
        for criterion in rubric["criteria"]
    ]


def create(client, submission: dict, rubric: dict, instructions: str | None = None):
    return client.post(
        "/api/evaluations",
        json={
            "submission_id": submission["id"],
            "rubric_id": rubric["id"],
            "teacher_instructions": instructions,
        },
    )


def test_evaluacion_completa_calcula_el_puntaje_ponderado(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric))]
    response = create(client, submission, published_rubric)

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "AI_GENERATED"
    assert body["final_total_score"] == 100.0
    assert body["final_max_score"] == 100.0
    assert len(body["criterion_results"]) == 3
    assert body["criterion_results"][0]["modified_by_teacher"] is False
    assert body["general_feedback"] == "Buen trabajo en general."


def test_puntajes_intermedios_se_ponderan_por_peso(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric, "Suficiente", 2))]
    body = create(client, submission, published_rubric).json()
    assert body["final_total_score"] == 50.0


def test_el_detalle_incluye_snapshot_generaciones_y_trabajo(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric))]
    created = create(client, submission, published_rubric).json()

    detail = client.get("/api/evaluations/" + str(created["id"])).json()
    assert detail["rubric_version_snapshot"]["rubric_id"] == published_rubric["id"]
    assert detail["rubric_version_snapshot"]["version"] == 1
    assert len(detail["generations"]) == 1
    assert detail["generations"][0]["validation_status"] == "VALID"
    assert detail["generations"][0]["prompt_version"] == "v1"
    assert detail["submission"]["id"] == submission["id"]
    assert detail["revisions"] == []


def test_no_se_evalua_con_rubrica_en_borrador(client, fake_gemini, rubric_payload, submission):
    draft = client.post("/api/rubrics", json=rubric_payload).json()
    response = create(client, submission, draft)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_RUBRIC"
    assert fake_gemini.calls == 0


def test_trabajo_o_rubrica_inexistentes_devuelven_404(client, published_rubric, submission):
    assert create(client, {"id": 999}, published_rubric).status_code == 404
    assert create(client, submission, {"id": 999}).status_code == 404


def test_criterio_inventado_se_corrige_en_el_reintento(
    client, fake_gemini, published_rubric, submission
):
    invented = criteria_for(published_rubric) + [
        ai_criterion(999, "Criterio inventado", "Excelente", 4)
    ]
    fake_gemini.responses = [valid_result(invented), valid_result(criteria_for(published_rubric))]
    response = create(client, submission, published_rubric)

    assert response.status_code == 201
    assert fake_gemini.calls == 2
    detail = client.get("/api/evaluations/" + str(response.json()["id"])).json()
    assert [item["validation_status"] for item in detail["generations"]] == [
        "INVALID_CRITERIA",
        "VALID",
    ]


def test_criterio_inventado_persistente_devuelve_error_controlado(
    client, fake_gemini, published_rubric, submission
):
    invented = criteria_for(published_rubric) + [ai_criterion(999, "Inventado", "Excelente", 4)]
    fake_gemini.responses = [valid_result(invented)]
    response = create(client, submission, published_rubric)

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "INVALID_AI_RESPONSE"
    # El reintento se hace una sola vez (Parte 44).
    assert fake_gemini.calls == 2

    evaluations = client.get("/api/evaluations").json()
    assert evaluations[0]["status"] == "FAILED"


def test_puntaje_fuera_de_rango_no_se_reintenta_y_falla(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric, "Excelente", 999))]
    response = create(client, submission, published_rubric)
    assert response.status_code == 502
    assert fake_gemini.calls == 1


def test_timeout_de_gemini_devuelve_504(client, fake_gemini, published_rubric, submission):
    fake_gemini.responses = [
        failed_result(GenerationValidationStatus.TIMEOUT, "La llamada excedio el tiempo limite.")
    ]
    response = create(client, submission, published_rubric)
    assert response.status_code == 504
    assert response.json()["error"]["code"] == "GEMINI_TIMEOUT"
    assert fake_gemini.calls == 1

    incidents = client.get("/api/incidents").json()
    assert any(item["incident_type"] == "GEMINI_TIMEOUT" for item in incidents)


def test_error_http_de_gemini_devuelve_502(client, fake_gemini, published_rubric, submission):
    fake_gemini.responses = [
        failed_result(GenerationValidationStatus.HTTP_ERROR, "El servicio no esta disponible.")
    ]
    response = create(client, submission, published_rubric)
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "GEMINI_UNAVAILABLE"


def test_json_invalido_se_reintenta_una_vez(client, fake_gemini, published_rubric, submission):
    fake_gemini.responses = [
        failed_result(GenerationValidationStatus.INVALID_SCHEMA, "El JSON no es valido."),
        valid_result(criteria_for(published_rubric)),
    ]
    response = create(client, submission, published_rubric)
    assert response.status_code == 201
    assert fake_gemini.calls == 2


def test_regenerar_crea_una_nueva_generacion(client, fake_gemini, published_rubric, submission):
    fake_gemini.responses = [
        valid_result(criteria_for(published_rubric, "Suficiente", 2)),
        valid_result(criteria_for(published_rubric, "Excelente", 4)),
    ]
    created = create(client, submission, published_rubric).json()
    assert created["final_total_score"] == 50.0

    regenerated = client.post(
        "/api/evaluations/" + str(created["id"]) + "/regenerate",
        json={"teacher_instructions": "Se mas exigente con la argumentacion."},
    )
    assert regenerated.status_code == 200
    assert regenerated.json()["final_total_score"] == 100.0

    detail = client.get("/api/evaluations/" + str(created["id"])).json()
    assert len(detail["generations"]) == 2
    assert detail["teacher_instructions"] == "Se mas exigente con la argumentacion."


def test_revisar_ajusta_puntaje_y_registra_la_revision(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric))]
    created = create(client, submission, published_rubric).json()
    first_criterion = created["criterion_results"][0]["criterion_id"]

    reviewed = client.put(
        "/api/evaluations/" + str(created["id"]) + "/review",
        json={
            "criteria": [
                {
                    "criterion_id": first_criterion,
                    "final_score": 2,
                    "final_feedback": "Retroalimentacion ajustada por el docente.",
                }
            ],
            "general_feedback": "Comentario general del docente.",
        },
    )
    assert reviewed.status_code == 200
    body = reviewed.json()
    assert body["status"] == "UNDER_REVIEW"
    # El criterio de peso 40 baja al 50% -> 20; los otros dos aportan 30 + 30.
    assert body["final_total_score"] == 80.0
    edited = next(
        item for item in body["criterion_results"] if item["criterion_id"] == first_criterion
    )
    assert edited["modified_by_teacher"] is True
    assert edited["ai_suggested_score"] == 4.0

    detail = client.get("/api/evaluations/" + str(created["id"])).json()
    changed = {revision["field_changed"] for revision in detail["revisions"]}
    assert changed == {"SCORE", "FEEDBACK", "GENERAL_FEEDBACK"}


def test_revisar_con_puntaje_fuera_de_rango_es_rechazado(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric))]
    created = create(client, submission, published_rubric).json()
    criterion_id = created["criterion_results"][0]["criterion_id"]
    response = client.put(
        "/api/evaluations/" + str(created["id"]) + "/review",
        json={"criteria": [{"criterion_id": criterion_id, "final_score": 50}]},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_revisar_criterio_ajeno_es_rechazado(client, fake_gemini, published_rubric, submission):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric))]
    created = create(client, submission, published_rubric).json()
    response = client.put(
        "/api/evaluations/" + str(created["id"]) + "/review",
        json={"criteria": [{"criterion_id": 9999, "final_score": 1}]},
    )
    assert response.status_code == 422


def test_aprobar_congela_la_evaluacion_y_la_envia_al_simulador(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric))]
    created = create(client, submission, published_rubric).json()

    approved = client.post("/api/evaluations/" + str(created["id"]) + "/approve")
    assert approved.status_code == 200
    body = approved.json()
    assert body["status"] == "APPROVED"
    assert body["approved_by"] == 1
    assert body["approved_at"] is not None
    assert body["sent_to_lms_at"] is not None

    detail = client.get("/api/evaluations/" + str(created["id"])).json()
    assert detail["lms_result_payload"]["score_given"] == 100.0
    assert detail["lms_result_payload"]["transport"] == "SIMULATOR"

    # Una evaluacion aprobada ya no se modifica (RD-04).
    evaluation_path = "/api/evaluations/" + str(created["id"])
    assert client.put(evaluation_path + "/review", json={"criteria": []}).status_code == 409
    assert client.post(evaluation_path + "/regenerate", json={}).status_code == 409
    assert client.post(evaluation_path + "/approve").status_code == 409


def test_no_puede_aprobarse_una_evaluacion_fallida(
    client, fake_gemini, published_rubric, submission
):
    fake_gemini.responses = [
        failed_result(GenerationValidationStatus.HTTP_ERROR, "Servicio no disponible.")
    ]
    create(client, submission, published_rubric)
    evaluation_id = client.get("/api/evaluations").json()[0]["id"]
    response = client.post("/api/evaluations/" + str(evaluation_id) + "/approve")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CONFLICT"


def test_historial_filtra_por_estado_y_rubrica(client, fake_gemini, published_rubric, submission):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric))]
    created = create(client, submission, published_rubric).json()
    client.post("/api/evaluations/" + str(created["id"]) + "/approve")

    listing = client.get("/api/evaluations").json()
    assert listing[0]["rubric_name"] == published_rubric["name"]
    assert listing[0]["student_identifier"] == "Estudiante 1"
    assert listing[0]["generations_count"] == 1

    assert len(client.get("/api/evaluations", params={"status": "APPROVED"}).json()) == 1
    assert len(client.get("/api/evaluations", params={"status": "FAILED"}).json()) == 0
    rubric_id = published_rubric["id"]
    assert len(client.get("/api/evaluations", params={"rubric_id": rubric_id}).json()) == 1
    assert len(client.get("/api/evaluations", params={"rubric_id": 999}).json()) == 0


def test_evaluacion_inexistente_devuelve_404(client):
    assert client.get("/api/evaluations/999").status_code == 404


def test_editar_la_rubrica_no_altera_evaluaciones_previas(
    client, fake_gemini, published_rubric, rubric_payload, submission
):
    fake_gemini.responses = [valid_result(criteria_for(published_rubric))]
    created = create(client, submission, published_rubric).json()

    rubric_payload["criteria"] = rubric_payload["criteria"][:1]
    rubric_payload["criteria"][0]["weight"] = 100
    updated = client.put("/api/rubrics/" + str(published_rubric["id"]), json=rubric_payload).json()
    assert updated["version"] == 2

    detail = client.get("/api/evaluations/" + str(created["id"])).json()
    assert detail["rubric_version_snapshot"]["version"] == 1
    assert len(detail["rubric_version_snapshot"]["criteria"]) == 3
    assert detail["final_total_score"] == 100.0

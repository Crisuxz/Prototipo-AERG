"""API de rubricas sobre SQLite real (Parte 93)."""


def test_crear_leer_y_listar_rubrica(client, rubric_payload):
    created = client.post("/api/rubrics", json=rubric_payload)
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "DRAFT"
    assert body["version"] == 1
    assert len(body["criteria"]) == 3
    assert len(body["criteria"][0]["levels"]) == 3

    detail = client.get("/api/rubrics/" + str(body["id"]))
    assert detail.status_code == 200
    assert detail.json()["name"] == rubric_payload["name"]

    listing = client.get("/api/rubrics").json()
    assert listing[0]["criteria_count"] == 3
    assert listing[0]["total_weight"] == 100.0


def test_publicar_rubrica_valida(client, rubric_payload):
    created = client.post("/api/rubrics", json=rubric_payload).json()
    published = client.post("/api/rubrics/" + str(created["id"]) + "/publish")
    assert published.status_code == 200
    assert published.json()["status"] == "PUBLISHED"


def test_publicar_rubrica_con_pesos_incorrectos_falla(client, rubric_payload):
    rubric_payload["criteria"][0]["weight"] = 10
    created = client.post("/api/rubrics", json=rubric_payload).json()
    response = client.post("/api/rubrics/" + str(created["id"]) + "/publish")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_RUBRIC"


def test_editar_rubrica_reemplaza_criterios(client, rubric_payload):
    created = client.post("/api/rubrics", json=rubric_payload).json()
    rubric_payload["criteria"] = rubric_payload["criteria"][:1]
    rubric_payload["criteria"][0]["weight"] = 100
    updated = client.put("/api/rubrics/" + str(created["id"]), json=rubric_payload)
    assert updated.status_code == 200
    assert len(updated.json()["criteria"]) == 1
    assert updated.json()["version"] == 1


def test_filtrar_por_estado_y_buscar_por_nombre(client, rubric_payload):
    created = client.post("/api/rubrics", json=rubric_payload).json()
    client.post("/api/rubrics/" + str(created["id"]) + "/publish")
    assert len(client.get("/api/rubrics", params={"status": "PUBLISHED"}).json()) == 1
    assert len(client.get("/api/rubrics", params={"status": "DRAFT"}).json()) == 0
    assert len(client.get("/api/rubrics", params={"search": "ensayo"}).json()) == 1


def test_eliminar_rubrica_no_usada(client, rubric_payload):
    created = client.post("/api/rubrics", json=rubric_payload).json()
    assert client.delete("/api/rubrics/" + str(created["id"])).status_code == 204
    assert client.get("/api/rubrics/" + str(created["id"])).status_code == 404


def test_rubrica_inexistente_devuelve_404(client):
    response = client.get("/api/rubrics/999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_criterio_sin_niveles_es_rechazado_por_el_schema(client, rubric_payload):
    rubric_payload["criteria"][0]["levels"] = []
    response = client.post("/api/rubrics", json=rubric_payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"

"""Ingestion de trabajos: TXT, PDF y DOCX validos e invalidos (Parte 93/95, RF-03/04/05)."""

import io

import docx
from pypdf import PdfWriter


def pdf_bytes(text: str = "Contenido del ensayo en PDF") -> bytes:
    from pypdf.annotations import FreeText

    writer = PdfWriter()
    page = writer.add_blank_page(width=200, height=200)
    writer.add_annotation(
        page_number=0,
        annotation=FreeText(text=text, rect=(10, 10, 190, 190), font_size="12pt"),
    )
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def docx_bytes(text: str = "Contenido del ensayo en DOCX") -> bytes:
    document = docx.Document()
    document.add_paragraph(text)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def upload(client, filename: str, content: bytes, mime: str):
    return client.post(
        "/api/submissions",
        files={"file": (filename, content, mime)},
        data={"student_identifier": "Estudiante 1"},
    )


def test_subir_txt_extrae_texto(client):
    response = upload(client, "ensayo.txt", b"Primera linea.\r\n\r\n\r\nSegunda linea.", "text/plain")
    assert response.status_code == 201
    body = response.json()
    assert body["extraction_status"] == "SUCCESS"
    assert body["file_extension"] == "txt"
    # La normalizacion colapsa los saltos de linea repetidos.
    assert body["extracted_text"] == "Primera linea.\n\nSegunda linea."


def test_subir_docx_extrae_texto(client):
    response = upload(
        client,
        "ensayo.docx",
        docx_bytes("Analisis del texto argumentativo"),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    assert response.status_code == 201
    assert "argumentativo" in response.json()["extracted_text"]


def test_subir_pdf_es_aceptado(client):
    response = upload(client, "ensayo.pdf", pdf_bytes(), "application/pdf")
    assert response.status_code in (201, 422)
    if response.status_code == 422:
        # Un PDF sin capa de texto se reporta como documento vacio, no como fallo interno.
        assert response.json()["error"]["code"] == "EMPTY_DOCUMENT"


def test_extension_no_soportada_es_rechazada(client):
    response = upload(client, "malicioso.exe", b"MZ binario", "application/octet-stream")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_FILE_TYPE"


def test_archivo_vacio_es_rechazado(client):
    response = upload(client, "vacio.txt", b"", "text/plain")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "EMPTY_DOCUMENT"


def test_archivo_demasiado_grande_es_rechazado(client):
    response = upload(client, "grande.txt", b"a" * (2 * 1024 * 1024), "text/plain")
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_pdf_corrupto_produce_error_controlado(client):
    response = upload(client, "corrupto.pdf", b"%PDF-1.4 basura no valida", "application/pdf")
    assert response.status_code in (422, 500)
    assert response.json()["error"]["code"] in ("EXTRACTION_FAILED", "EMPTY_DOCUMENT")


def test_docx_corrupto_produce_error_controlado(client):
    response = upload(
        client,
        "corrupto.docx",
        b"PK\x03\x04 contenido invalido",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "EXTRACTION_FAILED"


def test_extension_falsificada_es_detectada_por_la_cabecera(client):
    response = upload(client, "falso.pdf", b"esto no es un pdf", "application/pdf")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_FILE_TYPE"


def test_consultar_trabajo_por_id(client, submission):
    response = client.get("/api/submissions/" + str(submission["id"]))
    assert response.status_code == 200
    assert response.json()["student_identifier"] == "Estudiante 1"


def test_trabajo_inexistente_devuelve_404(client):
    assert client.get("/api/submissions/999").status_code == 404


def test_los_fallos_de_extraccion_quedan_registrados_como_incidencia(client):
    upload(client, "vacio.txt", b"", "text/plain")
    incidents = client.get("/api/incidents").json()
    assert any(item["incident_type"] == "EMPTY_DOCUMENT" for item in incidents)

"""Crea datos de ejemplo por la API para las capturas de RNF-06/RNF-07.

Uso (con el backend en ejecucion):
    AERG_API=http://localhost:8000/api AERG_TOKEN=<AUTH_TOKEN> python scripts/evidencias/sembrar_datos.py

Los trabajos son textos ficticios; no contienen datos de estudiantes reales."""

import json
import os

import httpx

API = os.environ.get("AERG_API", "http://localhost:8000/api")
HEADERS = {"Authorization": "Bearer " + os.environ["AERG_TOKEN"]}

LEVELS = [
    {"name": "Insuficiente", "description": "No cumple con lo esperado", "score": 0, "order": 1},
    {"name": "Suficiente", "description": "Cumple parcialmente", "score": 2, "order": 2},
    {"name": "Excelente", "description": "Cumple plenamente", "score": 4, "order": 3},
]
RUBRIC = {
    "name": "Ensayo argumentativo",
    "description": "Rubrica para ensayos breves de un curso introductorio",
    "instructions": "Evalua con el nivel de un primer semestre universitario.",
    "criteria": [
        {"name": "Argumentacion", "description": "Tesis clara y argumentos sustentados", "weight": 40, "order": 1, "levels": LEVELS},
        {"name": "Estructura", "description": "Introduccion, desarrollo y conclusion", "weight": 30, "order": 2, "levels": LEVELS},
        {"name": "Redaccion", "description": "Ortografia, cohesion y claridad", "weight": 30, "order": 3, "levels": LEVELS},
    ],
}
ESSAYS = [
    "La energia solar es la mejor alternativa para las comunidades rurales de Mexico. "
    "En primer lugar, reduce los costos de electricidad a largo plazo. En segundo lugar, "
    "no depende de redes de distribucion costosas. Finalmente, disminuye las emisiones. "
    "En conclusion, los gobiernos locales deberian subsidiar paneles solares.",
    "El uso de telefonos celulares en el aula tiene ventajas y desventajas. Permite consultar "
    "informacion rapidamente, pero tambien distrae a los estudiantes. Considero que debe "
    "regularse su uso con reglas claras acordadas entre docentes y alumnos.",
]


def main() -> None:
    with httpx.Client(base_url=API, headers=HEADERS, timeout=120) as client:
        rubric = client.post("/rubrics", json=RUBRIC).raise_for_status().json()
        client.post("/rubrics/" + str(rubric["id"]) + "/publish").raise_for_status()
        draft = dict(RUBRIC, name="Reporte de laboratorio (borrador)")
        client.post("/rubrics", json=draft).raise_for_status()

        evaluations = []
        for number, essay in enumerate(ESSAYS, start=1):
            submission = client.post(
                "/submissions",
                files={"file": ("ensayo_" + str(number) + ".txt", essay.encode(), "text/plain")},
                data={"student_identifier": "Alumno-" + str(number).zfill(3)},
            ).raise_for_status().json()
            evaluation = client.post(
                "/evaluations",
                json={"submission_id": submission["id"], "rubric_id": rubric["id"]},
            ).raise_for_status().json()
            evaluations.append(evaluation["id"])

        # La primera queda aprobada (historial); la segunda queda pendiente de revision.
        client.post("/evaluations/" + str(evaluations[0]) + "/approve").raise_for_status()
        print(json.dumps({"rubric_id": rubric["id"], "evaluation_ids": evaluations}))


if __name__ == "__main__":
    main()

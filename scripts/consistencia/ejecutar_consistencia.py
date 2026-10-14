"""Crea las ejecuciones de consistencia de una evaluacion (I3).

Toma el trabajo y la rubrica de la evaluacion indicada y llama dos veces a
POST /api/evaluations con esos mismos datos. Cada llamada crea una evaluacion nueva,
separada de la original y sin aprobar; la original no se modifica.

Requiere el backend en marcha (uvicorn en 127.0.0.1:8000).

Uso:
    python ejecutar_consistencia.py ID_EVALUACION_ORIGINAL [--veces 2]
"""

import argparse
import json
import re
import sqlite3
import urllib.error
import urllib.request
from pathlib import Path

RAIZ_BACKEND = Path(__file__).resolve().parents[2] / "backend"
API = "http://127.0.0.1:8000/api"


def token_de_backend():
    """Lee AUTH_TOKEN de backend/.env sin cargar la configuracion completa de la app."""
    for linea in (RAIZ_BACKEND / ".env").read_text(encoding="utf-8").splitlines():
        coincidencia = re.match(r"^AUTH_TOKEN=(.*)$", linea.strip())
        if coincidencia:
            return coincidencia.group(1)
    raise SystemExit("No se encontro AUTH_TOKEN en backend/.env")


def trabajo_y_rubrica(evaluacion_id):
    db = sqlite3.connect(f"file:{RAIZ_BACKEND / 'app.db'}?mode=ro", uri=True)
    fila = db.execute("SELECT submission_id, rubric_id FROM evaluations WHERE id = ?", (evaluacion_id,)).fetchone()
    db.close()
    if fila is None:
        raise SystemExit(f"La evaluacion {evaluacion_id} no existe.")
    return fila


def crear_evaluacion(token, submission_id, rubric_id):
    cuerpo = json.dumps({"submission_id": submission_id, "rubric_id": rubric_id}).encode("utf-8")
    peticion = urllib.request.Request(
        f"{API}/evaluations",
        data=cuerpo,
        method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(peticion, timeout=600) as respuesta:
            return json.loads(respuesta.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        raise SystemExit(f"La API respondio {error.code}: {error.read().decode('utf-8', 'replace')}")
    except urllib.error.URLError as error:
        raise SystemExit(f"No se pudo conectar con el backend ({error.reason}). Revisa que este en marcha.")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("evaluacion_id", type=int)
    parser.add_argument("--veces", type=int, default=2)
    args = parser.parse_args()

    submission_id, rubric_id = trabajo_y_rubrica(args.evaluacion_id)
    token = token_de_backend()

    print(f"Trabajo {submission_id}, rubrica {rubric_id}, original {args.evaluacion_id}")
    for numero in range(1, args.veces + 1):
        evaluacion = crear_evaluacion(token, submission_id, rubric_id)
        print(
            f"  Ejecucion de consistencia {numero}: evaluacion {evaluacion['id']}, "
            f"estado {evaluacion['status']}, total {evaluacion['final_total_score']}"
        )


if __name__ == "__main__":
    main()

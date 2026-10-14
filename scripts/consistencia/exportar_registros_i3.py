"""Exporta los registros de la hoja I3 (Registros del sistema y consistencia) desde app.db.

Solo lectura: abre la base en modo ro y no escribe nada en ella.

Parte A: una fila por evaluacion aprobada.
Parte B: por cada evaluacion aprobada, la ejecucion original mas las dos ejecuciones
         de consistencia creadas despues con ejecutar_consistencia.py (mismo trabajo
         y rubrica, no aprobadas). Los totales se recalculan con el ScoringEngine a
         partir de la propuesta de la IA guardada en cada generacion.

Uso:
    python exportar_registros_i3.py [--db ../../backend/app.db] [--out salida]
"""

import argparse
import csv
import json
import sqlite3
import statistics
import sys
from datetime import datetime
from pathlib import Path

RAIZ_BACKEND = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(RAIZ_BACKEND))

from app.services import scoring  # noqa: E402  (motor de puntajes del backend, sin efectos secundarios)

EJECUCIONES_CONSISTENCIA = 2


def a_fecha(texto):
    return datetime.fromisoformat(texto) if texto else None


def minutos_entre(inicio, fin):
    return round((fin - inicio).total_seconds() / 60, 2)


def generacion_actual(db, evaluacion):
    return db.execute(
        "SELECT * FROM evaluation_generations WHERE id = ?", (evaluacion["current_generation_id"],)
    ).fetchone()


def puntajes_y_niveles(db, evaluacion):
    """Recalcula total y niveles de una evaluacion con la propuesta de la IA (no con revisiones
    del docente), para que las tres ejecuciones sean comparables."""
    gen = generacion_actual(db, evaluacion)
    snapshot = json.loads(evaluacion["rubric_version_snapshot"])
    raw = json.loads(gen["raw_response"])["evaluation"]["criteria"]
    ids_criterios = [str(c["id"]) for c in snapshot["criteria"]]
    puntajes = {}
    niveles = {}
    for item in raw:
        cid = str(item["criterion_id"])
        puntajes[int(cid)] = float(item["suggested_score"])
        niveles[cid] = item["selected_level"].strip().lower()
    total = scoring.compute(snapshot, puntajes).final_total_score
    return total, niveles, ids_criterios


def fila_parte_a(db, evaluacion):
    cambios_criterios = db.execute(
        "SELECT COUNT(*) FROM evaluation_criterion_results WHERE evaluation_id = ? AND modified_by_teacher = 1",
        (evaluacion["id"],),
    ).fetchone()[0]
    total_criterios = db.execute(
        "SELECT COUNT(*) FROM evaluation_criterion_results WHERE evaluation_id = ?", (evaluacion["id"],)
    ).fetchone()[0]
    revisiones = db.execute(
        "SELECT COUNT(*) FROM evaluation_revisions WHERE evaluation_id = ?", (evaluacion["id"],)
    ).fetchone()[0]
    generaciones = db.execute(
        "SELECT COUNT(*) FROM evaluation_generations WHERE evaluation_id = ?", (evaluacion["id"],)
    ).fetchone()[0]
    incidencias = db.execute(
        "SELECT COUNT(*) FROM incident_logs WHERE related_entity_type = 'EVALUATION' AND related_entity_id = ?",
        (evaluacion["id"],),
    ).fetchone()[0]
    aprobador = db.execute("SELECT name FROM users WHERE id = ?", (evaluacion["approved_by"],)).fetchone()
    trabajo = db.execute("SELECT * FROM submissions WHERE id = ?", (evaluacion["submission_id"],)).fetchone()
    gen = generacion_actual(db, evaluacion)

    sin_cambios = cambios_criterios == 0 and revisiones == 0
    minutos = minutos_entre(a_fecha(trabajo["created_at"]), a_fecha(evaluacion["approved_at"]))
    return {
        "Trabajo": evaluacion["submission_id"],
        "Archivo": trabajo["original_filename"],
        "Evaluacion": evaluacion["id"],
        "Docente que aprobo": aprobador["name"] if aprobador else "",
        "Aprobo sin cambiar nada": "Si" if sin_cambios else "No",
        "Criterios que cambio": cambios_criterios,
        "Criterios totales": total_criterios,
        "Veces que regenero": generaciones - 1,
        "Tiempo respuesta IA (ms)": gen["latency_ms"],
        "Incidencias": incidencias,
        "Minutos hasta aprobar": minutos,
        "_sin_cambios": sin_cambios,
    }


def ejecuciones_de(db, evaluacion):
    """La original y las dos evaluaciones creadas despues para el mismo trabajo, no aprobadas
    y con generacion valida. Devuelve la lista y si estan completas."""
    extras = db.execute(
        """SELECT * FROM evaluations
           WHERE submission_id = ? AND id > ? AND status != 'APPROVED'
             AND current_generation_id IS NOT NULL
           ORDER BY id LIMIT ?""",
        (evaluacion["submission_id"], evaluacion["id"], EJECUCIONES_CONSISTENCIA),
    ).fetchall()
    return [evaluacion] + extras, len(extras) == EJECUCIONES_CONSISTENCIA


def fila_parte_b(db, evaluacion):
    ejecuciones, completas = ejecuciones_de(db, evaluacion)
    resultados = [puntajes_y_niveles(db, ejecucion) for ejecucion in ejecuciones]
    totales = [total for total, _, _ in resultados]
    niveles = [niveles_por_criterio for _, niveles_por_criterio, _ in resultados]
    criterios = resultados[0][2]
    iguales = 0
    for cid in criterios:
        nivel_por_ejecucion = {nivel.get(cid) for nivel in niveles}
        if len(nivel_por_ejecucion) == 1 and None not in nivel_por_ejecucion:
            iguales += 1
    if not completas:
        # Sin las tres ejecuciones la desviacion y el acuerdo no significan nada: no se calculan.
        iguales_fila, porcentaje_fila, desviacion = "", "", None
        porcentaje = None
    else:
        desviacion = round(statistics.stdev(totales), 2)
        porcentaje = round(iguales / len(criterios) * 100, 1)
        iguales_fila, porcentaje_fila = iguales, porcentaje
    fila = {
        "Trabajo": evaluacion["submission_id"],
        "Evaluacion original": evaluacion["id"],
        "Total ejecucion 1": totales[0],
        "Total ejecucion 2": totales[1] if len(totales) > 1 else "",
        "Total ejecucion 3": totales[2] if len(totales) > 2 else "",
        "Desviacion estandar": desviacion if desviacion is not None else "",
        "Criterios iguales": iguales_fila,
        "Criterios evaluados": len(criterios),
        "% criterios iguales": porcentaje_fila,
        "Ejecuciones completas": "Si" if completas else "No",
    }
    return fila, desviacion, porcentaje


def escribir_csv(ruta, filas):
    if not filas:
        return
    with open(ruta, "w", newline="", encoding="utf-8-sig") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=[k for k in filas[0] if not k.startswith("_")])
        escritor.writeheader()
        for fila in filas:
            escritor.writerow({k: v for k, v in fila.items() if not k.startswith("_")})


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--db", default=str(RAIZ_BACKEND / "app.db"))
    parser.add_argument("--out", default=str(Path(__file__).parent / "salida"))
    args = parser.parse_args()

    db = sqlite3.connect(f"file:{args.db}?mode=ro", uri=True)
    db.row_factory = sqlite3.Row

    aprobadas = db.execute("SELECT * FROM evaluations WHERE status = 'APPROVED' ORDER BY id").fetchall()
    if not aprobadas:
        print("No hay evaluaciones aprobadas en la base.")
        return

    parte_a = [fila_parte_a(db, e) for e in aprobadas]
    parte_b, desviaciones, porcentajes = [], [], []
    for evaluacion in aprobadas:
        fila, desviacion, porcentaje = fila_parte_b(db, evaluacion)
        parte_b.append(fila)
        if desviacion is not None:
            desviaciones.append(desviacion)
        if porcentaje is not None:
            porcentajes.append(porcentaje)

    criterios_totales = sum(f["Criterios totales"] for f in parte_a)
    criterios_cambiados = sum(f["Criterios que cambio"] for f in parte_a)
    resumen = [
        {"Resultado": "% evaluaciones aprobadas sin cambios",
         "Valor": round(sum(f["_sin_cambios"] for f in parte_a) / len(parte_a) * 100, 1)},
        {"Resultado": "% criterios que el docente cambio",
         "Valor": round(criterios_cambiados / criterios_totales * 100, 1)},
        {"Resultado": "Tiempo respuesta IA mediana (ms)",
         "Valor": statistics.median(f["Tiempo respuesta IA (ms)"] for f in parte_a)},
        {"Resultado": "Minutos hasta aprobar mediana",
         "Valor": statistics.median(f["Minutos hasta aprobar"] for f in parte_a)},
        {"Resultado": "Desviacion estandar promedio (referencia: hasta 5)",
         "Valor": round(statistics.mean(desviaciones), 2) if desviaciones else ""},
        {"Resultado": "% criterios iguales entre ejecuciones (referencia: al menos 80)",
         "Valor": round(statistics.mean(porcentajes), 1) if porcentajes else ""},
    ]

    salida = Path(args.out)
    salida.mkdir(parents=True, exist_ok=True)
    escribir_csv(salida / "parte_A.csv", parte_a)
    escribir_csv(salida / "parte_B.csv", parte_b)
    escribir_csv(salida / "resultado_final.csv", resumen)

    print(f"Evaluaciones aprobadas: {len(aprobadas)}")
    for linea in resumen:
        print(f"  {linea['Resultado']}: {linea['Valor']}")
    incompletas = [f["Trabajo"] for f in parte_b if f["Ejecuciones completas"] == "No"]
    if incompletas:
        print(f"Aviso: faltan ejecuciones de consistencia en los trabajos {incompletas}.")
    print(f"Archivos escritos en: {salida}")


if __name__ == "__main__":
    main()

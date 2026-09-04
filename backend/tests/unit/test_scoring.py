"""ScoringEngine: calculo determinista y acotado (Parte 46, RF-10)."""

from app.services import scoring


def snapshot(criteria: list[dict]) -> dict:
    return {"rubric_id": 1, "version": 1, "criteria": criteria}


def criterion(criterion_id: int, weight: float, scores: list[float]) -> dict:
    return {
        "id": criterion_id,
        "name": "Criterio " + str(criterion_id),
        "weight": weight,
        "order": criterion_id,
        "levels": [
            {"id": criterion_id * 10 + index, "name": "N" + str(index), "score": score, "order": index}
            for index, score in enumerate(scores, start=1)
        ],
    }


def test_puntaje_maximo_del_criterio_es_el_mayor_de_sus_niveles():
    assert scoring.max_level_score(criterion(1, 100, [0, 2, 4])) == 4


def test_total_ponderado_con_puntajes_maximos_da_100():
    data = snapshot([criterion(1, 40, [0, 4]), criterion(2, 30, [0, 4]), criterion(3, 30, [0, 4])])
    totals = scoring.compute(data, {1: 4, 2: 4, 3: 4})
    assert totals.final_total_score == 100.0
    assert totals.final_max_score == 100.0


def test_ponderacion_proporcional_por_criterio():
    data = snapshot([criterion(1, 40, [0, 4]), criterion(2, 60, [0, 10])])
    totals = scoring.compute(data, {1: 2, 2: 5})
    assert totals.final_total_score == 50.0


def test_puntaje_por_encima_del_maximo_se_acota():
    data = snapshot([criterion(1, 100, [0, 4])])
    totals = scoring.compute(data, {1: 999})
    assert totals.criteria[0].final_score == 4.0
    assert totals.criteria[0].was_clamped is True
    assert totals.final_total_score == 100.0


def test_puntaje_negativo_se_acota_a_cero():
    data = snapshot([criterion(1, 100, [0, 4])])
    totals = scoring.compute(data, {1: -5})
    assert totals.criteria[0].final_score == 0.0
    assert totals.criteria[0].was_clamped is True


def test_criterio_con_un_solo_nivel_de_puntaje_cero_no_divide_entre_cero():
    data = snapshot([criterion(1, 100, [0])])
    totals = scoring.compute(data, {1: 0})
    assert totals.final_total_score == 0.0


def test_criterio_sin_puntaje_recibido_cuenta_como_cero():
    data = snapshot([criterion(1, 50, [0, 4]), criterion(2, 50, [0, 4])])
    totals = scoring.compute(data, {1: 4})
    assert totals.final_total_score == 50.0


def test_puntaje_en_el_borde_superior_no_se_marca_como_acotado():
    data = snapshot([criterion(1, 100, [0, 4])])
    totals = scoring.compute(data, {1: 4})
    assert totals.criteria[0].was_clamped is False

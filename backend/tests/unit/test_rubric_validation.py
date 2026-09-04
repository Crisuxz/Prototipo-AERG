"""Reglas de integridad de rubricas (Parte 92, RD-01/RD-02)."""

from dataclasses import dataclass, field

import pytest

from app.core.errors import DomainError
from app.services.rubric_service import validate_structure


@dataclass
class Level:
    name: str = "Nivel"
    score: float = 1.0
    order: int = 1


@dataclass
class Criterion:
    name: str = "Criterio"
    weight: float = 100.0
    order: int = 1
    levels: list = field(default_factory=lambda: [Level()])


def test_pesos_que_suman_100_son_validos_para_publicar():
    criteria = [
        Criterion(name="A", weight=40, order=1),
        Criterion(name="B", weight=30, order=2),
        Criterion(name="C", weight=30, order=3),
    ]
    validate_structure(criteria, require_complete=True)


def test_pesos_que_no_suman_100_impiden_publicar():
    criteria = [Criterion(name="A", weight=40, order=1), Criterion(name="B", weight=50, order=2)]
    with pytest.raises(DomainError) as error:
        validate_structure(criteria, require_complete=True)
    assert error.value.code == "INVALID_RUBRIC"
    assert error.value.status_code == 422


def test_pesos_incompletos_se_permiten_en_borrador():
    validate_structure([Criterion(weight=40)], require_complete=False)


def test_criterio_sin_niveles_es_invalido():
    with pytest.raises(DomainError):
        validate_structure([Criterion(levels=[])], require_complete=False)


def test_nivel_con_puntaje_negativo_es_invalido():
    with pytest.raises(DomainError) as error:
        validate_structure([Criterion(levels=[Level(score=-1)])], require_complete=False)
    assert "negativo" in error.value.message


def test_niveles_con_el_mismo_orden_son_invalidos():
    criterion = Criterion(levels=[Level(name="A", order=1), Level(name="B", order=1)])
    with pytest.raises(DomainError) as error:
        validate_structure([criterion], require_complete=False)
    assert "mismo orden" in error.value.message


def test_criterios_con_el_mismo_orden_son_invalidos():
    criteria = [Criterion(name="A", order=1), Criterion(name="B", order=1)]
    with pytest.raises(DomainError):
        validate_structure(criteria, require_complete=False)


def test_rubrica_sin_criterios_no_puede_publicarse():
    with pytest.raises(DomainError) as error:
        validate_structure([], require_complete=True)
    assert "al menos un criterio" in error.value.message

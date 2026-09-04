"""Motor de puntuacion determinista (Parte 46).

Regla fundamental (punto 18 del plan): el backend nunca confia en un calculo del modelo.
La IA solo sugiere un `suggested_score` por criterio; aqui se acota al rango real del
criterio segun el snapshot de rubrica y se recalcula el ponderado y el total.

    weighted_score = (final_score / max_level_score) * weight
    final_total_score = sum(weighted_score)
    final_max_score   = sum(weight)

Este modulo es puro: no toca base de datos ni servicios externos."""

from dataclasses import dataclass

DECIMALS = 2


@dataclass(frozen=True)
class CriterionScore:
    criterion_id: int
    final_score: float
    weighted_score: float
    was_clamped: bool


@dataclass(frozen=True)
class ScoreTotals:
    criteria: list[CriterionScore]
    final_total_score: float
    final_max_score: float


def max_level_score(criterion_snapshot: dict) -> float:
    levels = criterion_snapshot.get("levels") or []
    return max((float(level["score"]) for level in levels), default=0.0)


def clamp(value: float, maximum: float) -> tuple[float, bool]:
    if value < 0:
        return 0.0, True
    if value > maximum:
        return maximum, True
    return value, False


def compute_criterion(criterion_snapshot: dict, raw_score: float) -> CriterionScore:
    maximum = max_level_score(criterion_snapshot)
    final_score, was_clamped = clamp(float(raw_score), maximum)
    weight = float(criterion_snapshot["weight"])
    weighted = 0.0 if maximum == 0 else (final_score / maximum) * weight
    return CriterionScore(
        criterion_id=int(criterion_snapshot["id"]),
        final_score=round(final_score, DECIMALS),
        weighted_score=round(weighted, DECIMALS),
        was_clamped=was_clamped,
    )


def compute(snapshot: dict, scores_by_criterion: dict[int, float]) -> ScoreTotals:
    """Recalcula la puntuacion completa a partir del snapshot y los scores vigentes
    (sugeridos por la IA o editados por el docente)."""
    criteria: list[CriterionScore] = []
    for criterion in snapshot.get("criteria", []):
        raw = scores_by_criterion.get(int(criterion["id"]), 0.0)
        criteria.append(compute_criterion(criterion, raw))

    total = round(sum(item.weighted_score for item in criteria), DECIMALS)
    maximum = round(
        sum(float(criterion["weight"]) for criterion in snapshot.get("criteria", [])), DECIMALS
    )
    return ScoreTotals(criteria=criteria, final_total_score=total, final_max_score=maximum)

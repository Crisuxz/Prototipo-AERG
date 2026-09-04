"""Reglas de negocio de rubricas (RF-01, RF-02, RD-01, RD-02).

Reglas de integridad aplicadas aqui (Parte 30):
- La suma de pesos de los criterios debe ser exactamente 100 para publicar.
- Todo criterio publicado necesita al menos un nivel de desempenio; los scores son >= 0.
- Dentro de un criterio no puede haber dos niveles con el mismo `order`.
- Una rubrica ya usada en evaluaciones no se elimina: se archiva."""

from sqlalchemy.orm import Session

from app.core.errors import DomainError
from app.models.enums import RubricStatus
from app.models.rubric import PerformanceLevel, Rubric, RubricCriterion
from app.models.user import User
from app.repositories.rubric_repository import RubricRepository
from app.schemas.rubric import RubricCreateRequest, RubricUpdateRequest

WEIGHT_TOLERANCE = 0.01
TOTAL_WEIGHT = 100.0


def validate_structure(criteria: list, *, require_complete: bool) -> None:
    """Valida criterios y niveles. `require_complete` exige ademas las condiciones
    necesarias para publicar: al menos un criterio y pesos que sumen 100."""
    errors: list[str] = []

    if require_complete and not criteria:
        errors.append("La rubrica debe tener al menos un criterio para publicarse.")

    orders = [criterion.order for criterion in criteria]
    if len(set(orders)) != len(orders):
        errors.append("Hay criterios con el mismo orden.")

    for criterion in criteria:
        if not criterion.levels:
            errors.append("El criterio " + criterion.name + " no tiene niveles de desempenio.")
            continue
        level_orders = [level.order for level in criterion.levels]
        if len(set(level_orders)) != len(level_orders):
            errors.append("El criterio " + criterion.name + " tiene niveles con el mismo orden.")
        if any(level.score < 0 for level in criterion.levels):
            errors.append("El criterio " + criterion.name + " tiene niveles con puntaje negativo.")

    if require_complete and criteria:
        total = sum(criterion.weight for criterion in criteria)
        if abs(total - TOTAL_WEIGHT) > WEIGHT_TOLERANCE:
            errors.append("La suma de los pesos debe ser 100; actualmente es " + format(total, "g") + ".")

    if errors:
        raise DomainError("INVALID_RUBRIC", " ".join(errors), 422)


class RubricService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = RubricRepository(db)

    def get(self, rubric_id: int) -> Rubric:
        rubric = self.repository.get(rubric_id)
        if rubric is None:
            raise DomainError("NOT_FOUND", "La rubrica solicitada no existe.", 404)
        return rubric

    def list(self, status: RubricStatus | None = None, search: str | None = None) -> list[Rubric]:
        return self.repository.list(status=status, search=search)

    def create(self, payload: RubricCreateRequest, user: User) -> Rubric:
        validate_structure(payload.criteria, require_complete=False)
        rubric = Rubric(
            name=payload.name,
            description=payload.description,
            instructions=payload.instructions,
            status=RubricStatus.DRAFT,
            version=1,
            created_by=user.id,
            criteria=self._build_criteria(payload.criteria),
        )
        self.repository.add(rubric)
        self.db.commit()
        return self.get(rubric.id)

    def update(self, rubric_id: int, payload: RubricUpdateRequest) -> Rubric:
        rubric = self.get(rubric_id)
        if rubric.status == RubricStatus.ARCHIVED:
            raise DomainError("CONFLICT", "Una rubrica archivada no puede editarse.", 409)

        validate_structure(payload.criteria, require_complete=rubric.status == RubricStatus.PUBLISHED)

        rubric.name = payload.name
        rubric.description = payload.description
        rubric.instructions = payload.instructions
        # Se borran los criterios previos antes de insertar los nuevos: comparten la
        # restriccion de unicidad (rubric_id, order) y no pueden coexistir.
        rubric.criteria.clear()
        self.db.flush()
        rubric.criteria = self._build_criteria(payload.criteria)

        # Las evaluaciones ya creadas conservan su propio snapshot, asi que editar una
        # rubrica en uso no las altera; solo se incrementa la version para poder
        # distinguir con que revision se evaluo cada trabajo (Parte 27).
        if self.repository.usage_count(rubric.id) > 0:
            rubric.version += 1

        self.db.commit()
        return self.get(rubric.id)

    def publish(self, rubric_id: int) -> Rubric:
        rubric = self.get(rubric_id)
        if rubric.status == RubricStatus.ARCHIVED:
            raise DomainError("CONFLICT", "Una rubrica archivada no puede publicarse.", 409)
        validate_structure(rubric.criteria, require_complete=True)
        rubric.status = RubricStatus.PUBLISHED
        self.db.commit()
        return self.get(rubric.id)

    def delete(self, rubric_id: int) -> None:
        rubric = self.get(rubric_id)
        if self.repository.usage_count(rubric.id) > 0:
            raise DomainError(
                "RUBRIC_IN_USE",
                "La rubrica ya fue usada en evaluaciones; archivela en lugar de eliminarla.",
                409,
            )
        self.repository.delete(rubric)
        self.db.commit()

    def archive(self, rubric_id: int) -> Rubric:
        rubric = self.get(rubric_id)
        rubric.status = RubricStatus.ARCHIVED
        self.db.commit()
        return self.get(rubric.id)

    @staticmethod
    def _build_criteria(criteria_payload: list) -> list[RubricCriterion]:
        return [
            RubricCriterion(
                name=criterion.name,
                description=criterion.description,
                weight=criterion.weight,
                order=criterion.order,
                levels=[
                    PerformanceLevel(
                        name=level.name,
                        description=level.description,
                        score=level.score,
                        order=level.order,
                    )
                    for level in criterion.levels
                ],
            )
            for criterion in criteria_payload
        ]

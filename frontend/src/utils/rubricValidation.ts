import type { RubricInput } from '../types'

/** Ids de los campos del editor: la lista de errores enlaza a ellos para llevar el foco. */
export const fieldId = {
  name: 'rubric-name',
  criteria: 'rubric-criteria',
  criterionName: (c: number) => `criterion-${c}-name`,
  criterionWeight: (c: number) => `criterion-${c}-weight`,
  levelName: (c: number, l: number) => `criterion-${c}-level-${l}-name`,
  levelScore: (c: number, l: number) => `criterion-${c}-level-${l}-score`,
}

/** Mapa id de campo -> mensaje. Un mapa vacio significa que la rubrica es valida. */
export type RubricErrors = Record<string, string>

/**
 * Replica en el cliente las reglas del backend (schemas/rubric.py y validate_structure) para
 * decirle al docente exactamente que falta antes de enviar. El backend sigue siendo autoritativo.
 * `requireComplete`: reglas extra para publicar (o editar una rubrica ya publicada).
 */
export function validateRubric(form: RubricInput, requireComplete: boolean): RubricErrors {
  const errors: RubricErrors = {}

  if (!form.name.trim()) errors[fieldId.name] = 'Escribe el nombre de la rúbrica.'

  if (form.criteria.length === 0) errors[fieldId.criteria] = 'Agrega al menos un criterio.'

  form.criteria.forEach((criterion, c) => {
    const criterionLabel = criterion.name.trim() ? `"${criterion.name.trim()}"` : `${c + 1}`
    if (!criterion.name.trim()) {
      errors[fieldId.criterionName(c)] = `Escribe el nombre del criterio ${c + 1}.`
    }
    if (Number.isNaN(criterion.weight)) {
      errors[fieldId.criterionWeight(c)] = `Escribe el peso (%) del criterio ${criterionLabel}.`
    } else if (!Number.isFinite(criterion.weight) || criterion.weight < 0 || criterion.weight > 100) {
      errors[fieldId.criterionWeight(c)] = `El peso del criterio ${criterionLabel} debe estar entre 0 y 100.`
    }
    criterion.levels.forEach((level, l) => {
      if (!level.name.trim()) {
        errors[fieldId.levelName(c, l)] = `Escribe el nombre del nivel ${l + 1} del criterio ${criterionLabel}.`
      }
      if (Number.isNaN(level.score)) {
        errors[fieldId.levelScore(c, l)] = `Escribe el porcentaje del nivel ${l + 1} del criterio ${criterionLabel}.`
      } else if (!Number.isFinite(level.score) || level.score < 0 || level.score > 100) {
        errors[fieldId.levelScore(c, l)] =
          `El porcentaje del nivel ${l + 1} del criterio ${criterionLabel} debe estar entre 0 y 100.`
      }
    })
    // El nivel mas alto define el maximo del criterio en el calculo; con 100 % el porcentaje de cada
    // nivel equivale a la parte de la calificacion que otorga.
    const scores = criterion.levels.map((level) => level.score)
    if (scores.length > 0 && scores.every((score) => Number.isFinite(score) && score >= 0 && score <= 100)) {
      const top = Math.max(...scores)
      if (top !== 100) {
        errors[fieldId.levelScore(c, scores.indexOf(top))] =
          `El nivel más alto del criterio ${criterionLabel} debe valer 100 % (calificación completa).`
      }
    }
  })

  if (requireComplete && form.criteria.length > 0) {
    const total = form.criteria.reduce((sum, criterion) => sum + (criterion.weight || 0), 0)
    if (Math.abs(total - 100) > 0.01) {
      errors[fieldId.criteria] = `Los pesos de los criterios suman ${total}%; deben sumar exactamente 100%.`
    }
  }

  return errors
}

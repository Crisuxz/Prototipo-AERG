import type { PerformanceLevelInput } from '../types'
import { fieldId, type RubricErrors } from '../utils/rubricValidation'
import { FormField } from './FormField'
import { PlusIcon, TrashIcon } from './icons'

interface PerformanceLevelEditorProps {
  levels: PerformanceLevelInput[]
  /** Indice del criterio (0, 1, ...) para construir los ids de los campos. */
  criterionIndex: number
  /** Ej. "criterio 2": contexto para los nombres accesibles de los botones. */
  criterionLabel: string
  errors: RubricErrors
  onChange: (levels: PerformanceLevelInput[]) => void
  disabled?: boolean
}

const SCORE_EXAMPLES = [100, 80, 60, 0]

export function PerformanceLevelEditor({
  levels,
  criterionIndex,
  criterionLabel,
  errors,
  onChange,
  disabled,
}: PerformanceLevelEditorProps) {
  const update = (index: number, patch: Partial<PerformanceLevelInput>) => {
    onChange(levels.map((level, position) => (position === index ? { ...level, ...patch } : level)))
  }

  const remove = (index: number) => {
    onChange(
      levels
        .filter((_, position) => position !== index)
        .map((level, position) => ({ ...level, order: position + 1 })),
    )
  }

  const add = () => {
    onChange([...levels, { name: '', description: null, score: NaN, order: levels.length + 1 }])
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-700">Niveles de desempeño</legend>
      <p className="text-xs text-gray-600">
        Cada criterio inicia con los niveles estándar Excelente, Bueno, Regular y Malo; puedes agregar o quitar
        niveles. El porcentaje indica qué parte de la calificación del criterio obtiene un trabajo en ese nivel:
        100 % es la calificación completa y 0 % no otorga calificación.
      </p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {levels.map((level, index) => (
          <li key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Nivel {index + 1}</p>
              <button
                type="button"
                disabled={disabled || levels.length === 1}
                onClick={() => remove(index)}
                aria-label={`Quitar nivel ${index + 1} del ${criterionLabel}`}
                title={levels.length === 1 ? 'Cada criterio necesita al menos un nivel' : 'Quitar nivel'}
                className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              <FormField
                id={fieldId.levelName(criterionIndex, index)}
                label="Nombre"
                size="sm"
                required
                maxLength={255}
                value={level.name}
                disabled={disabled}
                placeholder="Ej. Sobresaliente"
                error={errors[fieldId.levelName(criterionIndex, index)]}
                onChange={(event) => update(index, { name: event.target.value })}
              />
              <FormField
                id={`criterion-${criterionIndex}-level-${index}-description`}
                label="Descripción (opcional)"
                size="sm"
                multiline
                rows={2}
                value={level.description ?? ''}
                disabled={disabled}
                placeholder="Ej. Presenta una tesis clara sustentada con evidencia"
                onChange={(event) => update(index, { description: event.target.value || null })}
              />
              <FormField
                id={fieldId.levelScore(criterionIndex, index)}
                label="Porcentaje (%)"
                size="sm"
                required
                inputMode="decimal"
                min={0}
                max={100}
                step="1"
                numberValue={level.score}
                disabled={disabled}
                placeholder={`Ej. ${SCORE_EXAMPLES[index] ?? 50}`}
                error={errors[fieldId.levelScore(criterionIndex, index)]}
                onNumberChange={(score) => update(index, { score })}
              />
            </div>
          </li>
        ))}
        <li>
          <button
            type="button"
            disabled={disabled}
            onClick={add}
            aria-label={`Agregar nivel al ${criterionLabel}`}
            className="flex h-full min-h-24 w-full items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 px-2 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-40"
          >
            <PlusIcon className="h-4 w-4" />
            Agregar nivel
          </button>
        </li>
      </ul>
    </fieldset>
  )
}

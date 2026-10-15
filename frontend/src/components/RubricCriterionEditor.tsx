import type { RubricCriterionInput } from '../types'
import { fieldId, type RubricErrors } from '../utils/rubricValidation'
import { FormField } from './FormField'
import { TrashIcon } from './icons'
import { PerformanceLevelEditor } from './PerformanceLevelEditor'

interface RubricCriterionEditorProps {
  criterion: RubricCriterionInput
  /** Indice del criterio (0, 1, ...). */
  index: number
  errors: RubricErrors
  onChange: (criterion: RubricCriterionInput) => void
  onRemove: () => void
  disabled?: boolean
  canRemove?: boolean
}

export function RubricCriterionEditor({
  criterion,
  index,
  errors,
  onChange,
  onRemove,
  disabled,
  canRemove = true,
}: RubricCriterionEditorProps) {
  const label = `criterio ${index + 1}`
  return (
    <section
      aria-labelledby={`criterion-${index}-title`}
      className="rounded-xl border border-gray-200 bg-white p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={`criterion-${index}-title`} className="font-semibold text-gray-900">
          Criterio {index + 1}
          {criterion.name.trim() && <span className="font-normal text-gray-600"> · {criterion.name.trim()}</span>}
        </h3>
        <button
          type="button"
          disabled={disabled || !canRemove}
          onClick={onRemove}
          aria-label={`Eliminar ${label}`}
          title={canRemove ? 'Eliminar criterio' : 'La rúbrica necesita al menos un criterio'}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
        >
          <TrashIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Eliminar</span>
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_9rem]">
        <FormField
          id={fieldId.criterionName(index)}
          label="Nombre del criterio"
          required
          maxLength={255}
          value={criterion.name}
          disabled={disabled}
          placeholder="Ej. Argumentación"
          error={errors[fieldId.criterionName(index)]}
          onChange={(event) => onChange({ ...criterion, name: event.target.value })}
        />
        <FormField
          id={fieldId.criterionWeight(index)}
          label="Peso (%)"
          required
          inputMode="decimal"
          min={0}
          max={100}
          numberValue={criterion.weight}
          disabled={disabled}
          placeholder="Ej. 40"
          error={errors[fieldId.criterionWeight(index)]}
          onNumberChange={(weight) => onChange({ ...criterion, weight })}
        />
      </div>
      <div className="mt-3">
        <FormField
          id={`criterion-${index}-description`}
          label="Descripción (opcional)"
          value={criterion.description ?? ''}
          disabled={disabled}
          placeholder="Ej. La tesis es clara y está sustentada con argumentos y evidencia"
          onChange={(event) => onChange({ ...criterion, description: event.target.value || null })}
        />
      </div>

      <div className="mt-4">
        <PerformanceLevelEditor
          levels={criterion.levels}
          criterionIndex={index}
          criterionLabel={label}
          errors={errors}
          disabled={disabled}
          onChange={(levels) => onChange({ ...criterion, levels })}
        />
      </div>
    </section>
  )
}

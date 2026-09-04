import type { RubricCriterionInput } from '../types'
import { PerformanceLevelEditor } from './PerformanceLevelEditor'

interface RubricCriterionEditorProps {
  criterion: RubricCriterionInput
  onChange: (criterion: RubricCriterionInput) => void
  onRemove: () => void
  disabled?: boolean
}

export function RubricCriterionEditor({
  criterion,
  onChange,
  onRemove,
  disabled,
}: RubricCriterionEditorProps) {
  return (
    <section className="rounded border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={criterion.name}
          disabled={disabled}
          placeholder="Nombre del criterio"
          onChange={(event) => onChange({ ...criterion, name: event.target.value })}
          className="min-w-56 flex-1 rounded border border-gray-300 px-2 py-1 text-sm font-medium"
        />
        <label className="flex items-center gap-1 text-sm text-gray-600">
          Peso
          <input
            type="number"
            min={0}
            max={100}
            value={criterion.weight}
            disabled={disabled}
            onChange={(event) => onChange({ ...criterion, weight: Number(event.target.value) })}
            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="text-sm text-red-600 disabled:opacity-40"
        >
          Eliminar criterio
        </button>
      </div>
      <input
        value={criterion.description ?? ''}
        disabled={disabled}
        placeholder="Descripcion del criterio (opcional)"
        onChange={(event) => onChange({ ...criterion, description: event.target.value || null })}
        className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <div className="mt-3">
        <PerformanceLevelEditor
          levels={criterion.levels}
          disabled={disabled}
          onChange={(levels) => onChange({ ...criterion, levels })}
        />
      </div>
    </section>
  )
}

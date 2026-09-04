import type { RubricCriterionInput } from '../types'
import { TrashIcon } from './icons'
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
    <tr className="border-t border-gray-100 align-top">
      <td className="px-4 py-4">
        <input
          value={criterion.name}
          disabled={disabled}
          placeholder="Nombre del criterio"
          onChange={(event) => onChange({ ...criterion, name: event.target.value })}
          className="w-full min-w-40 rounded-lg border border-transparent px-2 py-1 text-sm font-medium text-gray-900 hover:border-gray-200 focus:border-indigo-400 focus:outline-none"
        />
        <input
          value={criterion.description ?? ''}
          disabled={disabled}
          placeholder="Descripcion (opcional)"
          onChange={(event) => onChange({ ...criterion, description: event.target.value || null })}
          className="mt-1 w-full min-w-40 rounded-lg border border-transparent px-2 py-1 text-xs text-gray-500 hover:border-gray-200 focus:border-indigo-400 focus:outline-none"
        />
      </td>
      <td className="px-4 py-4">
        <PerformanceLevelEditor
          levels={criterion.levels}
          disabled={disabled}
          onChange={(levels) => onChange({ ...criterion, levels })}
        />
      </td>
      <td className="px-4 py-4">
        <input
          type="number"
          min={0}
          max={100}
          value={criterion.weight}
          disabled={disabled}
          onChange={(event) => onChange({ ...criterion, weight: Number(event.target.value) })}
          className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none"
        />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            aria-label="Eliminar criterio"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

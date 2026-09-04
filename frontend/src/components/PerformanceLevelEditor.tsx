import type { PerformanceLevelInput } from '../types'
import { PlusIcon, TrashIcon } from './icons'

interface PerformanceLevelEditorProps {
  levels: PerformanceLevelInput[]
  onChange: (levels: PerformanceLevelInput[]) => void
  disabled?: boolean
}

export function PerformanceLevelEditor({
  levels,
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
    onChange([...levels, { name: '', description: null, score: 0, order: levels.length + 1 }])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {levels.map((level, index) => (
        <div
          key={index}
          className="flex min-w-40 items-start gap-1 rounded-lg border border-gray-200 bg-gray-50 p-2"
        >
          <div className="min-w-0 flex-1">
            <input
              value={level.name}
              disabled={disabled}
              placeholder="Nivel"
              onChange={(event) => update(index, { name: event.target.value })}
              className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs font-medium text-gray-900 focus:border-indigo-300 focus:outline-none"
            />
            <input
              value={level.description ?? ''}
              disabled={disabled}
              placeholder="Descripcion"
              onChange={(event) => update(index, { description: event.target.value || null })}
              className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-gray-500 focus:border-indigo-300 focus:outline-none"
            />
            <input
              type="number"
              min={0}
              step="0.5"
              value={level.score}
              disabled={disabled}
              onChange={(event) => update(index, { score: Number(event.target.value) })}
              className="w-14 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-gray-700 focus:border-indigo-300 focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={disabled || levels.length === 1}
            onClick={() => remove(index)}
            aria-label="Quitar nivel"
            className="rounded p-0.5 text-gray-400 hover:text-red-600 disabled:opacity-40"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={add}
        className="flex items-center gap-1 self-start rounded-lg border border-dashed border-gray-300 px-2 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Nivel
      </button>
    </div>
  )
}

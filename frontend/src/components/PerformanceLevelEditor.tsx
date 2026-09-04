import type { PerformanceLevelInput } from '../types'

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
    onChange([
      ...levels,
      { name: '', description: null, score: 0, order: levels.length + 1 },
    ])
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Niveles de desempenio
      </p>
      {levels.map((level, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <input
            value={level.name}
            disabled={disabled}
            placeholder="Nombre del nivel"
            onChange={(event) => update(index, { name: event.target.value })}
            className="w-40 rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <input
            value={level.description ?? ''}
            disabled={disabled}
            placeholder="Descripcion"
            onChange={(event) => update(index, { description: event.target.value || null })}
            className="min-w-48 flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <input
            type="number"
            min={0}
            step="0.5"
            value={level.score}
            disabled={disabled}
            onChange={(event) => update(index, { score: Number(event.target.value) })}
            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            disabled={disabled || levels.length === 1}
            onClick={() => remove(index)}
            className="text-sm text-red-600 disabled:opacity-40"
          >
            Quitar
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={add}
        className="text-sm font-medium text-purple-700 disabled:opacity-40"
      >
        + Agregar nivel
      </button>
    </div>
  )
}

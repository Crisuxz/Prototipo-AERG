interface ScoreEditorProps {
  value: number
  max: number
  disabled?: boolean
  onChange: (value: number) => void
}

/** El maximo proviene del snapshot de rubrica; el backend vuelve a validarlo al guardar. */
export function ScoreEditor({ value, max, disabled, onChange }: ScoreEditorProps) {
  return (
    <label className="flex items-center gap-1.5 text-sm">
      <input
        type="number"
        min={0}
        max={max}
        step="0.5"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm font-semibold text-gray-900 focus:border-indigo-400 focus:outline-none"
      />
      <span className="text-gray-400">/ {max}</span>
    </label>
  )
}

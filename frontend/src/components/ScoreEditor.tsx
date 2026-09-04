interface ScoreEditorProps {
  value: number
  max: number
  disabled?: boolean
  onChange: (value: number) => void
}

/** El maximo proviene del snapshot de rubrica; el backend vuelve a validarlo al guardar. */
export function ScoreEditor({ value, max, disabled, onChange }: ScoreEditorProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">Puntaje</span>
      <input
        type="number"
        min={0}
        max={max}
        step="0.5"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <span className="text-gray-500">de {max}</span>
    </label>
  )
}

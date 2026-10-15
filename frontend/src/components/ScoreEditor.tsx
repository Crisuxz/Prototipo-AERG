import { useId } from 'react'

import { useNumberText } from '../hooks/useNumberText'
import { isScoreValid } from '../utils/score'

interface ScoreEditorProps {
  value: number
  max: number
  label: string
  disabled?: boolean
  onChange: (value: number) => void
}

/** El maximo proviene del snapshot de rúbrica; el backend vuelve a validarlo al guardar. */
export function ScoreEditor({ value, max, label, disabled, onChange }: ScoreEditorProps) {
  const errorId = useId()
  const invalid = !isScoreValid(value, max)
  const text = useNumberText(value, onChange)
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm">
        <span className="sr-only">{label}</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={max}
          step="0.5"
          {...text}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          className={`w-16 rounded-lg border px-2 py-1 text-sm font-semibold text-gray-900 ${
            invalid ? 'border-red-500 bg-red-50 focus:border-red-600' : 'border-gray-300 focus:border-indigo-500'
          }`}
        />
        <span className="text-gray-600">/ {max}</span>
      </label>
      {invalid && (
        <p id={errorId} className="mt-1 text-xs text-red-700">
          {Number.isNaN(value) ? `Escribe un puntaje entre 0 y ${max}.` : `Debe estar entre 0 y ${max}.`}
        </p>
      )}
    </div>
  )
}

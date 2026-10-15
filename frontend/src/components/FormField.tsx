import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

import { useNumberText } from '../hooks/useNumberText'

type BaseProps = {
  id: string
  label: string
  /** Texto de ayuda permanente bajo el campo. */
  hint?: string
  error?: string
  required?: boolean
  size?: 'sm' | 'md'
}

type InputProps = BaseProps & { multiline?: false } & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'>
/** Campo numerico: recibe y entrega numeros; vacio se entrega como NaN. */
type NumberProps = BaseProps & {
  multiline?: false
  numberValue: number
  onNumberChange: (value: number) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'size' | 'type' | 'value' | 'onChange'>

function NumberInput({
  numberValue,
  onNumberChange,
  ...rest
}: { numberValue: number; onNumberChange: (value: number) => void } & InputHTMLAttributes<HTMLInputElement>) {
  const text = useNumberText(numberValue, onNumberChange)
  return <input {...rest} type="number" {...text} />
}
type TextareaProps = BaseProps & { multiline: true } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>

/**
 * Campo con etiqueta visible, ayuda y mensaje de error asociados por aria-describedby,
 * para que lectores de pantalla anuncien que va en el campo y que le falta.
 */
export function FormField(props: InputProps | TextareaProps | NumberProps) {
  const { id, label, hint, error, required, size = 'md', multiline, ...rest } = props
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const control = `mt-1 w-full rounded-lg border bg-white ${size === 'sm' ? 'px-2 py-1' : 'px-3 py-2'} ${textSize} text-gray-900 placeholder:text-gray-500 disabled:bg-gray-50 disabled:text-gray-600 ${
    error ? 'border-red-500 focus:border-red-600' : 'border-gray-300 focus:border-indigo-500'
  }`
  const shared = {
    id,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    className: control,
  }

  return (
    <div>
      <label htmlFor={id} className={`block font-medium text-gray-700 ${textSize}`}>
        {label}
        {required && (
          <span className="text-red-700" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {multiline ? (
        <textarea {...shared} {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : 'numberValue' in rest ? (
        <NumberInput {...shared} {...(rest as Omit<NumberProps, keyof BaseProps>)} />
      ) : (
        <input {...shared} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-gray-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

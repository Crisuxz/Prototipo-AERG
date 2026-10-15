import { useState, type ChangeEvent } from 'react'

const sameNumber = (a: number, b: number) => a === b || (Number.isNaN(a) && Number.isNaN(b))
const toText = (value: number) => (Number.isFinite(value) ? String(value) : '')

/**
 * Estado de texto para un <input type="number"> controlado. Si el input se ata directo a
 * un numero, al borrarlo `Number('')` lo regresa a 0 y escribir junto al 0 deja "050".
 * Aqui el input muestra exactamente lo que se escribe; vacio se reporta como NaN
 * (la validacion lo trata como "falta este dato") y al salir del campo se normaliza ("050" -> "50").
 */
export function useNumberText(value: number, onChange: (value: number) => void) {
  const [text, setText] = useState(toText(value))
  const [lastValue, setLastValue] = useState(value)

  // Si el valor cambia desde fuera (cargar la rubrica, quitar un nivel...), se refleja en el texto.
  if (!sameNumber(value, lastValue)) {
    setLastValue(value)
    if (!sameNumber(value, text.trim() === '' ? NaN : Number(text))) setText(toText(value))
  }

  return {
    value: text,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value
      setText(next)
      const parsed = next.trim() === '' ? NaN : Number(next)
      setLastValue(parsed)
      onChange(parsed)
    },
    onBlur: () => {
      if (text.trim() !== '' && Number.isFinite(Number(text))) setText(String(Number(text)))
    },
  }
}

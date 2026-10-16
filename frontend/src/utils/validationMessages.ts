/**
 * Traduce el detalle tecnico de VALIDATION_ERROR del backend (formato de core/errors.py:
 * "Datos de entrada invalidos. criteria.0.name: String should have at least 1 character; ...")
 * a frases en espanol que dicen que campo falta. Es la red de seguridad cuando la validacion
 * del cliente no cubre algun caso.
 */
const FIELD_NAMES: Record<string, string> = {
  name: 'el nombre',
  description: 'la descripción',
  instructions: 'las instrucciones',
  weight: 'el peso',
  score: 'el porcentaje',
  levels: 'los niveles',
  criteria: 'los criterios',
  student_identifier: 'el identificador del estudiante',
  final_score: 'el puntaje',
  final_feedback: 'la retroalimentación',
}

function describeLocation(location: string): string {
  const parts = location.split('.')
  const field = FIELD_NAMES[parts[parts.length - 1]] ?? `el campo "${parts[parts.length - 1]}"`
  const context: string[] = []
  for (let i = 0; i < parts.length - 1; i++) {
    const index = Number(parts[i + 1])
    if (Number.isInteger(index)) {
      if (parts[i] === 'criteria') context.push(`del criterio ${index + 1}`)
      if (parts[i] === 'levels') context.unshift(`del nivel ${index + 1}`)
      i++
    }
  }
  if (context.length === 0 && parts.length === 1) return `${field} de la rúbrica`
  return [field, ...context].join(' ')
}

function describeProblem(message: string): string {
  if (/at least 1 character/.test(message)) return 'está vacío'
  if (/at least 1 item/.test(message)) return 'necesita al menos un elemento'
  const max = message.match(/at most (\d+) character/)
  if (max) return `supera los ${max[1]} caracteres`
  const ge = message.match(/greater than or equal to ([\d.]+)/)
  if (ge) return `debe ser mayor o igual a ${ge[1]}`
  const le = message.match(/less than or equal to ([\d.]+)/)
  if (le) return `debe ser menor o igual a ${le[1]}`
  if (/valid number|valid integer/.test(message)) return 'debe ser un número'
  if (/Field required/.test(message)) return 'es obligatorio'
  return `no es válido (${message})`
}

export function translateValidationError(message: string): string {
  const details = message.replace(/^Datos de entrada invalidos\.\s*/, '')
  const items = details
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separator = item.indexOf(': ')
      if (separator === -1) return item
      const sentence = `${describeLocation(item.slice(0, separator))} ${describeProblem(item.slice(separator + 2))}`
      return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.'
    })
  if (items.length === 0) return 'Revisa los datos ingresados.'
  return `Revisa lo siguiente: ${items.join(' ')}`
}

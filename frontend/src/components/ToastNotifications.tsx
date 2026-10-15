import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import type { ApiError } from '../services/apiClient'
import { translateValidationError } from '../utils/validationMessages'
import { XIcon } from './icons'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  notify: (message: string, kind?: ToastKind) => void
  notifyError: (error: ApiError) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/** Mensajes en espanol para los codigos de error del contrato del backend (Parte 54). */
const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'No fue posible comunicarse con el servidor. Revisa que el backend esté en línea.',
  UNAUTHORIZED: 'La sesión no es válida. Revisa el token configurado en el frontend.',
  INVALID_FILE_TYPE: 'Formato no admitido. Solo se aceptan archivos TXT, PDF o DOCX.',
  FILE_TOO_LARGE: 'El archivo supera el tamaño maximo permitido.',
  EMPTY_DOCUMENT: 'El documento no contiene texto que se pueda evaluar.',
  EXTRACTION_FAILED: 'No fue posible leer el documento; puede estar dañado.',
  GEMINI_TIMEOUT: 'El servicio de IA tardó demasiado en responder. Intenta nuevamente.',
  GEMINI_UNAVAILABLE: 'El servicio de IA no está disponible en este momento.',
  INVALID_AI_RESPONSE: 'La propuesta de la IA no cumplio el contrato y fue descartada.',
  RUBRIC_IN_USE: 'La rúbrica ya se uso en evaluaciones; archivala en lugar de eliminarla.',
  CONFLICT: 'La operacion no es válida para el estado actual.',
}

const STYLES: Record<ToastKind, string> = {
  success: 'bg-emerald-700',
  error: 'bg-red-600',
  info: 'bg-gray-900',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current, { id, kind, message }])
      // Los errores permanecen hasta que el docente los cierra, para dar tiempo a leerlos (WCAG 2.2.1).
      if (kind !== 'error') window.setTimeout(() => dismiss(id), 6000)
    },
    [dismiss],
  )

  const notifyError = useCallback(
    (error: ApiError) =>
      notify(
        error.code === 'VALIDATION_ERROR'
          ? translateValidationError(error.message)
          : // El backend ya enumera que regla falla; se muestra en lugar de un mensaje generico.
            error.code === 'INVALID_RUBRIC'
            ? `La rúbrica no cumple las reglas: ${error.message}`
            : (ERROR_MESSAGES[error.code] ?? error.message),
        'error',
      ),
    [notify],
  )

  const value = useMemo(() => ({ notify, notifyError }), [notify, notifyError])

  const renderToast = (toast: Toast) => (
    <div
      key={toast.id}
      className={`flex max-w-sm items-start gap-3 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${STYLES[toast.kind]}`}
    >
      <p className="flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Cerrar aviso"
        className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-white/80 hover:bg-white/20 hover:text-white focus-visible:outline-white"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Las regiones vivas existen siempre para que los lectores de pantalla anuncien cada aviso. */}
      <div className="fixed bottom-4 right-4 left-4 z-50 flex flex-col items-end gap-2 sm:left-auto">
        <div role="alert" className="flex flex-col items-end gap-2">
          {toasts.filter((toast) => toast.kind === 'error').map(renderToast)}
        </div>
        <div role="status" className="flex flex-col items-end gap-2">
          {toasts.filter((toast) => toast.kind !== 'error').map(renderToast)}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider.')
  return context
}

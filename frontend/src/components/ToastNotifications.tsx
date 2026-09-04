import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import type { ApiError } from '../services/apiClient'

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
  NETWORK_ERROR: 'No fue posible comunicarse con el servidor. Revisa que el backend este en linea.',
  UNAUTHORIZED: 'La sesion no es valida. Revisa el token configurado en el frontend.',
  INVALID_RUBRIC: 'La rubrica no cumple las reglas: revisa los pesos y los niveles.',
  INVALID_FILE_TYPE: 'Formato no admitido. Solo se aceptan archivos TXT, PDF o DOCX.',
  FILE_TOO_LARGE: 'El archivo supera el tamano maximo permitido.',
  EMPTY_DOCUMENT: 'El documento no contiene texto que se pueda evaluar.',
  EXTRACTION_FAILED: 'No fue posible leer el documento; puede estar danado.',
  GEMINI_TIMEOUT: 'El servicio de IA tardo demasiado en responder. Intenta nuevamente.',
  GEMINI_UNAVAILABLE: 'El servicio de IA no esta disponible en este momento.',
  INVALID_AI_RESPONSE: 'La propuesta de la IA no cumplio el contrato y fue descartada.',
  RUBRIC_IN_USE: 'La rubrica ya se uso en evaluaciones; archivala en lugar de eliminarla.',
  CONFLICT: 'La operacion no es valida para el estado actual.',
}

const STYLES: Record<ToastKind, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-gray-800',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, kind, message }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 5000)
  }, [])

  const notifyError = useCallback(
    (error: ApiError) => notify(ERROR_MESSAGES[error.code] ?? error.message, 'error'),
    [notify],
  )

  const value = useMemo(() => ({ notify, notifyError }), [notify, notifyError])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`max-w-sm rounded px-4 py-2 text-sm text-white shadow ${STYLES[toast.kind]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider.')
  return context
}

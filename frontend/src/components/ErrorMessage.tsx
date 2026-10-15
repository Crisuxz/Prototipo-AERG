/** Error de carga anunciado a lectores de pantalla, con opcion de reintentar. */
export function ErrorMessage({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
    >
      <p className="flex-1">{message ?? 'Ocurrió un error inesperado.'}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-100"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}

export function Loader({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-sm text-gray-600">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"
      />
      {label}
    </div>
  )
}

export function Loader({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-gray-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      {label}
    </div>
  )
}

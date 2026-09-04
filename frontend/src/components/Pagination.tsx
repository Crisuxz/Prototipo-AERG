interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-end gap-2 py-3 text-sm">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="text-gray-600">
        Pagina {page} de {totalPages}
      </span>
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  )
}

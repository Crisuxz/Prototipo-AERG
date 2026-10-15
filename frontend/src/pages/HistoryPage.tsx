import { useMemo, useState } from 'react'

import { EmptyState } from '../components/EmptyState'
import { HistoryTable } from '../components/HistoryTable'
import { CalendarIcon, ChevronDownIcon, SearchIcon } from '../components/icons'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loader } from '../components/Loader'
import { Pagination } from '../components/Pagination'
import { useEvaluations } from '../hooks/useEvaluation'
import { usePageTitle } from '../hooks/usePageTitle'

const PAGE_SIZE = 5

const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: 'all', label: 'Todo el historial' },
]

export function HistoryPage() {
  usePageTitle('Historial de evaluaciones')
  const [period, setPeriod] = useState('30')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const from = useMemo(() => {
    if (period === 'all') return undefined
    const date = new Date()
    date.setDate(date.getDate() - Number(period))
    return date.toISOString()
  }, [period])

  const evaluations = useEvaluations({ from })

  const filtered = (evaluations.data ?? []).filter((item) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      item.original_filename.toLowerCase().includes(query) ||
      item.student_identifier.toLowerCase().includes(query) ||
      item.rubric_name.toLowerCase().includes(query)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Historial de evaluaciones</h1>
          <p className="mt-1 text-sm text-gray-600">
            Consulta las evaluaciones realizadas y revisa los resultados enviados a la plataforma.
          </p>
        </div>
        <label className="relative">
          <span className="sr-only">Periodo</span>
          <select
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value)
              setPage(1)
            }}
            className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm text-gray-700 focus:border-indigo-500"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        </label>
      </header>

      <div className="relative mt-5 max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="search"
          aria-label="Buscar evaluaciones"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Buscar por archivo, estudiante o rúbrica..."
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-500 focus:border-indigo-500"
        />
      </div>

      <div className="mt-5">
        {evaluations.status === 'loading' && <Loader label="Cargando historial..." />}
        {evaluations.status === 'error' && (
          <ErrorMessage message={evaluations.error?.message} onRetry={evaluations.reload} />
        )}
        {evaluations.status !== 'loading' &&
          evaluations.status !== 'error' &&
          filtered.length === 0 &&
          // Distingue "no hay nada" de "el filtro no encontro nada" para que el docente sepa que hacer.
          (search || period !== 'all' ? (
            <EmptyState
              title="Ninguna evaluación coincide con los filtros"
              description="Prueba con otro texto de búsqueda o amplía el periodo."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setPeriod('all')
                    setPage(1)
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Limpiar filtros
                </button>
              }
            />
          ) : (
            <EmptyState
              title="Sin evaluaciones registradas"
              description="Las evaluaciones que generes aparecerán aquí con su trazabilidad completa."
            />
          ))}
        {evaluations.status !== 'loading' && evaluations.status !== 'error' && filtered.length > 0 && (
          <>
            <HistoryTable caption="Historial de evaluaciones" evaluations={visible} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p role="status" className="text-sm text-gray-600">
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filtered.length)} de{' '}
                {filtered.length} evaluaciones
              </p>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

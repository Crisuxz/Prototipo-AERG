import { useMemo, useState } from 'react'

import { EmptyState } from '../components/EmptyState'
import { HistoryTable } from '../components/HistoryTable'
import { CalendarIcon, ChevronDownIcon, SearchIcon } from '../components/icons'
import { Loader } from '../components/Loader'
import { Pagination } from '../components/Pagination'
import { useEvaluations } from '../hooks/useEvaluation'

const PAGE_SIZE = 5

const PERIOD_OPTIONS = [
  { value: '7', label: 'Ultimos 7 dias' },
  { value: '30', label: 'Ultimos 30 dias' },
  { value: '90', label: 'Ultimos 90 dias' },
  { value: 'all', label: 'Todo el historial' },
]

export function HistoryPage() {
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
          <h2 className="text-2xl font-semibold text-gray-900">Historial de evaluaciones</h2>
          <p className="mt-1 text-sm text-gray-500">
            Consulta las evaluaciones realizadas y revisa los resultados enviados a la plataforma.
          </p>
        </div>
        <label className="relative">
          <select
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value)
              setPage(1)
            }}
            className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </label>
      </header>

      <div className="relative mt-5 max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Buscar por titulo, estudiante o actividad..."
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div className="mt-5">
        {evaluations.status === 'loading' && <Loader label="Cargando historial..." />}
        {evaluations.status === 'error' && (
          <p className="text-sm text-red-600">{evaluations.error?.message}</p>
        )}
        {evaluations.status !== 'loading' && evaluations.status !== 'error' && filtered.length === 0 && (
          <EmptyState
            title="Sin evaluaciones registradas"
            description="Las evaluaciones que generes apareceran aqui con su trazabilidad completa."
          />
        )}
        {evaluations.status !== 'loading' && evaluations.status !== 'error' && filtered.length > 0 && (
          <>
            <HistoryTable evaluations={visible} />
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
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

import { useState } from 'react'

import { EmptyState } from '../components/EmptyState'
import { HistoryTable } from '../components/HistoryTable'
import { Loader } from '../components/Loader'
import { Pagination } from '../components/Pagination'
import { useEvaluations } from '../hooks/useEvaluation'
import { useRubrics } from '../hooks/useRubrics'
import type { EvaluationStatus } from '../types'

const PAGE_SIZE = 10

const STATUS_FILTERS: { value: EvaluationStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'AI_GENERATED', label: 'Propuesta generada' },
  { value: 'UNDER_REVIEW', label: 'En revision' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'FAILED', label: 'Fallidas' },
]

export function HistoryPage() {
  const [status, setStatus] = useState<EvaluationStatus | ''>('')
  const [rubricId, setRubricId] = useState<number | ''>('')
  const [page, setPage] = useState(1)

  const rubrics = useRubrics()
  const evaluations = useEvaluations({
    status: status || undefined,
    rubric_id: rubricId === '' ? undefined : rubricId,
  })

  const all = evaluations.data ?? []
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
  const visible = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <h2 className="text-xl font-semibold">Historial de evaluaciones</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as EvaluationStatus | '')
            setPage(1)
          }}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          {STATUS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
        <select
          value={rubricId}
          onChange={(event) => {
            setRubricId(event.target.value === '' ? '' : Number(event.target.value))
            setPage(1)
          }}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todas las rubricas</option>
          {(rubrics.data ?? []).map((rubric) => (
            <option key={rubric.id} value={rubric.id}>
              {rubric.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        {evaluations.status === 'loading' && <Loader label="Cargando historial..." />}
        {evaluations.status === 'error' && (
          <p className="text-sm text-red-600">{evaluations.error?.message}</p>
        )}
        {evaluations.status === 'empty' && (
          <EmptyState
            title="Sin evaluaciones registradas"
            description="Las evaluaciones que generes apareceran aqui con su trazabilidad completa."
          />
        )}
        {evaluations.status === 'success' && (
          <>
            <HistoryTable evaluations={visible} />
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}

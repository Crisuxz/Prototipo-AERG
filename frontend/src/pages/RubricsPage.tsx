import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { Loader } from '../components/Loader'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/ToastNotifications'
import { useRubrics } from '../hooks/useRubrics'
import type { ApiError } from '../services/apiClient'
import { rubricsApi } from '../services/rubricsApi'
import type { RubricStatus } from '../types'

const STATUS_FILTERS: { value: RubricStatus | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'DRAFT', label: 'Borradores' },
  { value: 'PUBLISHED', label: 'Publicadas' },
  { value: 'ARCHIVED', label: 'Archivadas' },
]

export function RubricsPage() {
  const navigate = useNavigate()
  const { notify, notifyError } = useToast()
  const [status, setStatus] = useState<RubricStatus | ''>('')
  const [search, setSearch] = useState('')
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)

  const { data, status: requestStatus, error, reload } = useRubrics({
    status: status || undefined,
    search,
  })

  const remove = async () => {
    if (pendingDelete === null) return
    try {
      await rubricsApi.remove(pendingDelete)
      notify('Rubrica eliminada.', 'success')
      await reload()
    } catch (apiError) {
      notifyError(apiError as ApiError)
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <div>
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Rubricas</h2>
        <button
          type="button"
          onClick={() => navigate('/rubricas/nueva')}
          className="rounded bg-purple-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          Nueva rubrica
        </button>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={search}
          placeholder="Buscar por nombre"
          onChange={(event) => setSearch(event.target.value)}
          className="w-64 rounded border border-gray-300 px-3 py-1.5 text-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as RubricStatus | '')}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          {STATUS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        {requestStatus === 'loading' && <Loader label="Cargando rubricas..." />}
        {requestStatus === 'error' && (
          <p className="text-sm text-red-600">{error?.message}</p>
        )}
        {requestStatus === 'empty' && (
          <EmptyState
            title="Aun no hay rubricas"
            description="Crea la primera rubrica para poder evaluar trabajos."
          />
        )}
        {requestStatus === 'success' && data && (
          <table className="w-full border-collapse overflow-hidden rounded border border-gray-200 bg-white text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">Criterios</th>
                <th className="px-3 py-2">Peso total</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.map((rubric) => (
                <tr key={rubric.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <Link to={`/rubricas/${rubric.id}`} className="font-medium text-purple-700">
                      {rubric.name}
                    </Link>
                    {rubric.description && (
                      <p className="text-xs text-gray-500">{rubric.description}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={rubric.status} />
                  </td>
                  <td className="px-3 py-2">v{rubric.version}</td>
                  <td className="px-3 py-2">{rubric.criteria_count}</td>
                  <td
                    className={
                      rubric.total_weight === 100
                        ? 'px-3 py-2 text-green-700'
                        : 'px-3 py-2 text-amber-700'
                    }
                  >
                    {rubric.total_weight}%
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setPendingDelete(rubric.id)}
                      className="text-sm text-red-600"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar rubrica"
        message="Solo se pueden eliminar rubricas que no se hayan usado en evaluaciones. Deseas continuar?"
        confirmLabel="Eliminar"
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

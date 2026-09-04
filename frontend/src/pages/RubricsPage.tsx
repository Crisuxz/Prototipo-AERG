import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { EyeIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '../components/icons'
import { Loader } from '../components/Loader'
import { Pagination } from '../components/Pagination'
import { useToast } from '../components/ToastNotifications'
import { useRubrics } from '../hooks/useRubrics'
import type { ApiError } from '../services/apiClient'
import { rubricsApi } from '../services/rubricsApi'

const PAGE_SIZE = 5

export function RubricsPage() {
  const navigate = useNavigate()
  const { notify, notifyError } = useToast()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)

  const { data, status: requestStatus, error, reload } = useRubrics({ search })

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

  const all = data ?? []
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
  const visible = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Rubricas</h2>
          <p className="mt-1 text-sm text-gray-500">
            Administra las rubricas que utilizas para evaluar trabajos academicos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/rubricas/nueva')}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4" />
          Nueva rubrica
        </button>
      </header>

      <div className="relative mt-5 max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          placeholder="Buscar por nombre"
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div className="mt-5">
        {requestStatus === 'loading' && <Loader label="Cargando rubricas..." />}
        {requestStatus === 'error' && <p className="text-sm text-red-600">{error?.message}</p>}
        {requestStatus === 'empty' && (
          <EmptyState
            title="Aun no hay rubricas"
            description="Crea la primera rubrica para poder evaluar trabajos."
          />
        )}
        {requestStatus === 'success' && (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Nombre de la rubrica</th>
                    <th className="px-4 py-3">Descripcion</th>
                    <th className="px-4 py-3">Criterios</th>
                    <th className="px-4 py-3">Ultima modificacion</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((rubric) => (
                    <tr key={rubric.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">{rubric.name}</td>
                      <td className="max-w-xs px-4 py-3 text-gray-500">{rubric.description ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{rubric.criteria_count}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(rubric.updated_at).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/rubricas/${rubric.id}`}
                            aria-label="Ver detalles"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/rubricas/${rubric.id}`}
                            aria-label="Editar"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            aria-label="Eliminar"
                            onClick={() => setPendingDelete(rubric.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
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

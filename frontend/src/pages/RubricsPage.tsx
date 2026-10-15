import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '../components/icons'
import { Loader } from '../components/Loader'
import { Pagination } from '../components/Pagination'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/ToastNotifications'
import { usePageTitle } from '../hooks/usePageTitle'
import { useRubrics } from '../hooks/useRubrics'
import type { ApiError } from '../services/apiClient'
import { rubricsApi } from '../services/rubricsApi'

const PAGE_SIZE = 5

export function RubricsPage() {
  usePageTitle('Rúbricas')
  const { notify, notifyError } = useToast()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null)

  const { data, status: requestStatus, error, reload } = useRubrics({ search })

  const remove = async () => {
    if (pendingDelete === null) return
    try {
      await rubricsApi.remove(pendingDelete.id)
      notify('Rúbrica eliminada.', 'success')
      await reload()
    } catch (apiError) {
      notifyError(apiError as ApiError)
    } finally {
      setPendingDelete(null)
    }
  }

  const all = data ?? []
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
  // Al eliminar el ultimo elemento de la ultima pagina no debe quedar una tabla vacia.
  const currentPage = Math.min(page, totalPages)
  const visible = all.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Rúbricas</h1>
          <p className="mt-1 text-sm text-gray-600">
            Administra las rúbricas que utilizas para evaluar trabajos académicos.
          </p>
        </div>
        <Link
          to="/rubricas/nueva"
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4" />
          Nueva rúbrica
        </Link>
      </header>

      <div className="relative mt-5 max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="search"
          aria-label="Buscar rúbricas por nombre"
          value={search}
          placeholder="Buscar por nombre"
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-500 focus:border-indigo-500"
        />
      </div>

      <div className="mt-5">
        {requestStatus === 'loading' && <Loader label="Cargando rúbricas..." />}
        {requestStatus === 'error' && <ErrorMessage message={error?.message} onRetry={reload} />}
        {requestStatus === 'empty' &&
          (search ? (
            <EmptyState
              title={`Ninguna rúbrica coincide con "${search}"`}
              description="Revisa la ortografía o prueba con otra palabra."
            />
          ) : (
            <EmptyState
              title="Aún no hay rúbricas"
              description="Crea la primera rúbrica para poder evaluar trabajos."
              action={
                <Link
                  to="/rubricas/nueva"
                  className="inline-flex rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Crear rúbrica
                </Link>
              }
            />
          ))}
        {requestStatus === 'success' && (
          <>
            <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <caption className="sr-only">Rúbricas</caption>
                <thead className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Nombre de la rúbrica</th>
                    <th scope="col" className="px-4 py-3">Descripción</th>
                    <th scope="col" className="px-4 py-3">Estado</th>
                    <th scope="col" className="px-4 py-3">Criterios</th>
                    <th scope="col" className="px-4 py-3">Última modificacion</th>
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((rubric) => (
                    <tr key={rubric.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link to={`/rubricas/${rubric.id}`} className="hover:text-indigo-700 hover:underline">
                          {rubric.name}
                        </Link>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-gray-600">{rubric.description ?? '–'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={rubric.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-700">{rubric.criteria_count}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <time dateTime={rubric.updated_at}>
                          {new Date(rubric.updated_at).toLocaleDateString('es-MX')}
                        </time>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/rubricas/${rubric.id}`}
                            aria-label={`Editar ${rubric.name}`}
                            title="Editar"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-indigo-600"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            aria-label={`Eliminar ${rubric.name}`}
                            title="Eliminar"
                            onClick={() => setPendingDelete({ id: rubric.id, name: rubric.name })}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
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
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar rúbrica"
        message={`Se eliminará "${pendingDelete?.name ?? ''}". Solo se pueden eliminar rúbricas que no se hayan usado en evaluaciones; esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

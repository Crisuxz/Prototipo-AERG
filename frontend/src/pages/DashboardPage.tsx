import { Link } from 'react-router-dom'

import { EmptyState } from '../components/EmptyState'
import { HistoryTable } from '../components/HistoryTable'
import { Loader } from '../components/Loader'
import { useEvaluations } from '../hooks/useEvaluation'
import { useRubrics } from '../hooks/useRubrics'

export function DashboardPage() {
  const rubrics = useRubrics()
  const evaluations = useEvaluations()

  const allEvaluations = evaluations.data ?? []
  const approved = allEvaluations.filter((item) => item.status === 'APPROVED').length
  const pending = allEvaluations.filter(
    (item) => item.status === 'AI_GENERATED' || item.status === 'UNDER_REVIEW',
  ).length

  const cards = [
    { label: 'Rubricas', value: (rubrics.data ?? []).length, to: '/rubricas' },
    { label: 'Evaluaciones', value: allEvaluations.length, to: '/historial' },
    { label: 'Pendientes de revision', value: pending, to: '/historial' },
    { label: 'Aprobadas', value: approved, to: '/historial' },
  ]

  const loading = rubrics.status === 'loading' || evaluations.status === 'loading'

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-600">
            La IA propone una evaluacion, el docente revisa y aprueba.
          </p>
        </div>
        <Link
          to="/evaluar"
          className="rounded bg-purple-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          Evaluar trabajo
        </Link>
      </header>

      {loading ? (
        <Loader label="Cargando resumen..." />
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <Link
                key={card.label}
                to={card.to}
                className="rounded border border-gray-200 bg-white p-4 hover:border-purple-300"
              >
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold">{card.value}</p>
              </Link>
            ))}
          </div>

          <h3 className="mt-8 font-semibold">Evaluaciones recientes</h3>
          <div className="mt-3">
            {allEvaluations.length === 0 ? (
              <EmptyState
                title="Aun no has evaluado ningun trabajo"
                description="Sube un trabajo y elige una rubrica publicada para empezar."
              />
            ) : (
              <HistoryTable evaluations={allEvaluations.slice(0, 5)} />
            )}
          </div>
        </>
      )}
    </div>
  )
}

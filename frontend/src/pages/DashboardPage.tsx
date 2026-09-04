import { Link } from 'react-router-dom'

import { BellIcon, ClockIcon, FileUpIcon, GridIcon } from '../components/icons'
import { EmptyState } from '../components/EmptyState'
import { HistoryTable } from '../components/HistoryTable'
import { Loader } from '../components/Loader'
import { useEvaluations } from '../hooks/useEvaluation'
import { useRubrics } from '../hooks/useRubrics'

export function DashboardPage() {
  const rubrics = useRubrics()
  const evaluations = useEvaluations()

  const allEvaluations = evaluations.data ?? []
  const allRubrics = rubrics.data ?? []
  const now = new Date()
  const evaluationsThisMonth = allEvaluations.filter((item) => {
    const date = new Date(item.created_at)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).length
  const distinctSubmissions = new Set(allEvaluations.map((item) => item.submission_id)).size

  const loading = rubrics.status === 'loading' || evaluations.status === 'loading'

  const actionCards = [
    {
      to: '/evaluar',
      icon: FileUpIcon,
      iconBg: 'bg-indigo-100 text-indigo-600',
      title: 'Evaluar trabajo',
      description: 'Evalua un trabajo academico usando una rubrica y obten retroalimentacion generada por IA.',
      cta: 'Comenzar',
      ctaClass: 'bg-indigo-600 hover:bg-indigo-700',
    },
    {
      to: '/rubricas',
      icon: GridIcon,
      iconBg: 'bg-emerald-100 text-emerald-600',
      title: 'Rubricas',
      description: 'Crea y administra rubricas de evaluacion para tus actividades academicas.',
      cta: 'Administrar',
      ctaClass: 'bg-emerald-500 hover:bg-emerald-600',
    },
    {
      to: '/historial',
      icon: ClockIcon,
      iconBg: 'bg-amber-100 text-amber-600',
      title: 'Historial de evaluaciones',
      description: 'Consulta evaluaciones realizadas y revisa resultados anteriores.',
      cta: 'Ver historial',
      ctaClass: 'bg-amber-500 hover:bg-amber-600',
    },
  ]

  const stats = [
    { label: 'Evaluaciones realizadas', value: allEvaluations.length, icon: ClockIcon, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Trabajos evaluados', value: distinctSubmissions, icon: FileUpIcon, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Rubricas creadas', value: allRubrics.length, icon: ClockIcon, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Este mes evaluaciones', value: evaluationsThisMonth, icon: FileUpIcon, tone: 'bg-indigo-50 text-indigo-600' },
  ]

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Bienvenido, Docente!</h2>
          <p className="mt-1 text-sm text-gray-500">Que deseas hacer hoy?</p>
        </div>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        >
          <BellIcon className="h-5 w-5" />
        </button>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actionCards.map((card) => (
          <div key={card.to} className="flex flex-col rounded-xl border border-gray-200 bg-white p-5">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBg}`}>
              <card.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-semibold text-gray-900">{card.title}</h3>
            <p className="mt-1 flex-1 text-sm text-gray-500">{card.description}</p>
            <Link
              to={card.to}
              className={`mt-4 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-white ${card.ctaClass}`}
            >
              {card.cta}
            </Link>
          </div>
        ))}
      </div>

      <h3 className="mt-8 font-semibold text-gray-900">Resumen general</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{loading ? '-' : stat.value}</p>
            </div>
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.tone}`}>
              <stat.icon className="h-4.5 w-4.5" />
            </span>
          </div>
        ))}
      </div>

      <h3 className="mt-8 font-semibold text-gray-900">Evaluaciones recientes</h3>
      <div className="mt-3">
        {loading ? (
          <Loader label="Cargando resumen..." />
        ) : allEvaluations.length === 0 ? (
          <EmptyState
            title="Aun no has evaluado ningun trabajo"
            description="Sube un trabajo y elige una rubrica publicada para empezar."
          />
        ) : (
          <HistoryTable evaluations={allEvaluations.slice(0, 5)} />
        )}
      </div>
    </div>
  )
}

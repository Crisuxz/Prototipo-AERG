import { Link } from 'react-router-dom'

import { CalendarIcon, ClockIcon, FileTextIcon, FileUpIcon, GridIcon } from '../components/icons'
import { EmptyState } from '../components/EmptyState'
import { HistoryTable } from '../components/HistoryTable'
import { Loader } from '../components/Loader'
import { useEvaluations } from '../hooks/useEvaluation'
import { usePageTitle } from '../hooks/usePageTitle'
import { useRubrics } from '../hooks/useRubrics'

export function DashboardPage() {
  usePageTitle('Inicio')
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
      description: 'Evalúa un trabajo académico usando una rúbrica y obtén retroalimentación generada por IA.',
      cta: 'Comenzar',
      ctaClass: 'bg-indigo-600 hover:bg-indigo-700',
    },
    {
      to: '/rubricas',
      icon: GridIcon,
      iconBg: 'bg-emerald-100 text-emerald-600',
      title: 'Rúbricas',
      description: 'Crea y administra rúbricas de evaluación para tus actividades académicas.',
      cta: 'Administrar',
      ctaClass: 'bg-emerald-700 hover:bg-emerald-800',
    },
    {
      to: '/historial',
      icon: ClockIcon,
      iconBg: 'bg-amber-100 text-amber-600',
      title: 'Historial de evaluaciones',
      description: 'Consulta evaluaciones realizadas y revisa resultados anteriores.',
      cta: 'Ver historial',
      ctaClass: 'bg-amber-700 hover:bg-amber-800',
    },
  ]

  const stats = [
    { label: 'Evaluaciones realizadas', value: allEvaluations.length, icon: ClockIcon, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Trabajos evaluados', value: distinctSubmissions, icon: FileTextIcon, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Rúbricas creadas', value: allRubrics.length, icon: GridIcon, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Evaluaciones este mes', value: evaluationsThisMonth, icon: CalendarIcon, tone: 'bg-indigo-50 text-indigo-600' },
  ]

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">¡Bienvenido, docente!</h1>
        <p className="mt-1 text-sm text-gray-600">¿Qué deseas hacer hoy?</p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actionCards.map((card) => (
          <div key={card.to} className="flex flex-col rounded-xl border border-gray-200 bg-white p-5">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBg}`}>
              <card.icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-gray-900">{card.title}</h2>
            <p className="mt-1 flex-1 text-sm text-gray-600">{card.description}</p>
            <Link
              to={card.to}
              aria-label={`${card.cta}: ${card.title}`}
              className={`mt-4 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-white ${card.ctaClass}`}
            >
              {card.cta}
            </Link>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-semibold text-gray-900">Resumen general</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy={loading}>
        {stats.map((stat) => (
          <div key={stat.label} className="relative rounded-xl border border-gray-200 bg-white p-4 pr-16">
            <dt className="text-sm text-gray-600">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {loading ? '–' : stat.value}
              <span
                className={`absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg ${stat.tone}`}
              >
                <stat.icon className="h-4.5 w-4.5" />
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex items-baseline justify-between gap-2">
        <h2 className="font-semibold text-gray-900">Evaluaciones recientes</h2>
        {allEvaluations.length > 5 && (
          <Link to="/historial" className="text-sm font-medium text-indigo-700 hover:underline">
            Ver todas
          </Link>
        )}
      </div>
      <div className="mt-3">
        {loading ? (
          <Loader label="Cargando resumen..." />
        ) : evaluations.status === 'error' ? (
          <p role="alert" className="text-sm text-red-700">
            No se pudo cargar el resumen: {evaluations.error?.message}
          </p>
        ) : allEvaluations.length === 0 ? (
          <EmptyState
            title="Aún no has evaluado ningún trabajo"
            description="Sube un trabajo y elige una rúbrica publicada para empezar."
            action={
              <Link
                to="/evaluar"
                className="inline-flex rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Evaluar un trabajo
              </Link>
            }
          />
        ) : (
          <HistoryTable caption="Evaluaciones recientes" evaluations={allEvaluations.slice(0, 5)} />
        )}
      </div>
    </div>
  )
}

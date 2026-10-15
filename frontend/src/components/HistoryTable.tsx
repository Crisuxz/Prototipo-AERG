import { Link } from 'react-router-dom'

import type { EvaluationSummary } from '../types'
import { EyeIcon, FileTextIcon } from './icons'
import { ScoreLevelPill } from './ScoreLevel'
import { StatusBadge } from './StatusBadge'

interface HistoryTableProps {
  evaluations: EvaluationSummary[]
  caption: string
}

export function HistoryTable({ evaluations, caption }: HistoryTableProps) {
  return (
    <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
          <tr>
            <th scope="col" className="px-4 py-3">Trabajo / Actividad</th>
            <th scope="col" className="px-4 py-3">Estudiante</th>
            <th scope="col" className="px-4 py-3">Rúbrica utilizada</th>
            <th scope="col" className="px-4 py-3">Fecha de evaluación</th>
            <th scope="col" className="px-4 py-3">Calificación final</th>
            <th scope="col" className="px-4 py-3">Estatus</th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {evaluations.map((evaluation) => (
            <tr key={evaluation.id} className="border-t border-gray-100">
              <td className="px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <FileTextIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{evaluation.original_filename}</p>
                    <p className="text-xs text-gray-500">Trabajo evaluado</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-700">{evaluation.student_identifier}</td>
              <td className="px-4 py-3 text-gray-700">{evaluation.rubric_name}</td>
              <td className="px-4 py-3 text-gray-600">
                <time dateTime={evaluation.created_at}>
                  {new Date(evaluation.created_at).toLocaleString('es-MX', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </time>
              </td>
              <td className="px-4 py-3">
                {evaluation.final_total_score != null && evaluation.final_max_score ? (
                  <div>
                    <p className="font-semibold text-indigo-600">
                      {evaluation.final_total_score}
                      <span className="text-gray-500"> / {evaluation.final_max_score}</span>
                    </p>
                    <ScoreLevelPill score={evaluation.final_total_score} max={evaluation.final_max_score} />
                  </div>
                ) : (
                  <span className="text-gray-500">
                    <span aria-hidden="true">–</span>
                    <span className="sr-only">Sin calificación</span>
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge
                  status={
                    evaluation.status === 'APPROVED' && !evaluation.sent_to_lms_at
                      ? 'APPROVED_NOT_SENT'
                      : evaluation.status
                  }
                />
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/evaluaciones/${evaluation.id}/revision`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                  aria-label={`${evaluation.status === 'APPROVED' ? 'Ver' : 'Revisar'} evaluación de ${evaluation.student_identifier}: ${evaluation.original_filename}`}
                >
                  <EyeIcon className="h-4 w-4" />
                  {evaluation.status === 'APPROVED' ? 'Ver' : 'Revisar'}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

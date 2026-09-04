import { Link } from 'react-router-dom'

import type { EvaluationSummary } from '../types'
import { EyeIcon, FileTextIcon } from './icons'
import { ScoreLevelPill } from './ScoreLevel'
import { StatusBadge } from './StatusBadge'

export function HistoryTable({ evaluations }: { evaluations: EvaluationSummary[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead className="text-left text-xs font-medium uppercase tracking-wide text-gray-400">
          <tr>
            <th className="px-4 py-3">Trabajo / Actividad</th>
            <th className="px-4 py-3">Estudiante</th>
            <th className="px-4 py-3">Rubrica utilizada</th>
            <th className="px-4 py-3">Fecha de evaluacion</th>
            <th className="px-4 py-3">Calificacion final</th>
            <th className="px-4 py-3">Estatus</th>
            <th className="px-4 py-3" />
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
                    <p className="text-xs text-gray-400">Trabajo evaluado</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-700">{evaluation.student_identifier}</td>
              <td className="px-4 py-3 text-gray-700">{evaluation.rubric_name}</td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(evaluation.created_at).toLocaleString('es-MX', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </td>
              <td className="px-4 py-3">
                {evaluation.final_total_score != null && evaluation.final_max_score ? (
                  <div>
                    <p className="font-semibold text-indigo-600">
                      {evaluation.final_total_score}
                      <span className="text-gray-400"> / {evaluation.final_max_score}</span>
                    </p>
                    <ScoreLevelPill score={evaluation.final_total_score} max={evaluation.final_max_score} />
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={evaluation.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/evaluaciones/${evaluation.id}/revision`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
                  aria-label="Ver detalle"
                >
                  <EyeIcon className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { Link } from 'react-router-dom'

import type { EvaluationSummary } from '../types'
import { StatusBadge } from './StatusBadge'

export function HistoryTable({ evaluations }: { evaluations: EvaluationSummary[] }) {
  return (
    <table className="w-full border-collapse overflow-hidden rounded border border-gray-200 bg-white text-sm">
      <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="px-3 py-2">Estudiante</th>
          <th className="px-3 py-2">Archivo</th>
          <th className="px-3 py-2">Rubrica</th>
          <th className="px-3 py-2">Estado</th>
          <th className="px-3 py-2">Puntaje</th>
          <th className="px-3 py-2">Fecha</th>
          <th className="px-3 py-2" />
        </tr>
      </thead>
      <tbody>
        {evaluations.map((evaluation) => (
          <tr key={evaluation.id} className="border-t border-gray-100">
            <td className="px-3 py-2">{evaluation.student_identifier}</td>
            <td className="px-3 py-2 text-gray-600">{evaluation.original_filename}</td>
            <td className="px-3 py-2">{evaluation.rubric_name}</td>
            <td className="px-3 py-2">
              <StatusBadge status={evaluation.status} />
            </td>
            <td className="px-3 py-2">
              {evaluation.final_total_score ?? '-'} / {evaluation.final_max_score ?? '-'}
            </td>
            <td className="px-3 py-2 text-gray-600">
              {new Date(evaluation.created_at).toLocaleDateString('es-MX')}
            </td>
            <td className="px-3 py-2 text-right">
              <Link
                to={`/evaluaciones/${evaluation.id}/revision`}
                className="font-medium text-purple-700"
              >
                Ver detalle
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

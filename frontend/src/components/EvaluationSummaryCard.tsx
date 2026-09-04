import type { Evaluation } from '../types'
import { StatusBadge } from './StatusBadge'

interface EvaluationSummaryCardProps {
  evaluation: Evaluation
  studentIdentifier: string
  rubricName: string
}

export function EvaluationSummaryCard({
  evaluation,
  studentIdentifier,
  rubricName,
}: EvaluationSummaryCardProps) {
  return (
    <aside className="rounded border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Resumen</h2>
        <StatusBadge status={evaluation.status} />
      </div>
      <dl className="mt-3 space-y-1 text-sm text-gray-700">
        <div className="flex justify-between">
          <dt className="text-gray-500">Estudiante</dt>
          <dd>{studentIdentifier}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Rubrica</dt>
          <dd>{rubricName}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Puntaje</dt>
          <dd className="font-semibold">
            {evaluation.final_total_score ?? '-'} / {evaluation.final_max_score ?? '-'}
          </dd>
        </div>
        {evaluation.sent_to_lms_at && (
          <div className="flex justify-between">
            <dt className="text-gray-500">Enviado al LMS</dt>
            <dd>{new Date(evaluation.sent_to_lms_at).toLocaleString('es-MX')}</dd>
          </div>
        )}
      </dl>
    </aside>
  )
}

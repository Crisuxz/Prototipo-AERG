import type { EvaluationStatus, RubricStatus } from '../types'

const labels: Record<string, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  ARCHIVED: 'Archivada',
  PROCESSING: 'Procesando',
  AI_GENERATED: 'Propuesta generada',
  UNDER_REVIEW: 'En revision',
  APPROVED: 'Enviado',
  FAILED: 'Fallida',
  CANCELLED: 'Cancelada',
}

const styles: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-emerald-50 text-emerald-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
  PROCESSING: 'bg-indigo-50 text-indigo-700',
  AI_GENERATED: 'bg-violet-50 text-violet-700',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export function StatusBadge({ status }: { status: RubricStatus | EvaluationStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {labels[status] ?? status}
    </span>
  )
}

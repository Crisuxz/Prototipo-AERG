import type { EvaluationStatus, RubricStatus } from '../types'

const labels: Record<string, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  ARCHIVED: 'Archivada',
  PROCESSING: 'Procesando',
  AI_GENERATED: 'Propuesta generada',
  UNDER_REVIEW: 'En revision',
  APPROVED: 'Aprobada',
  FAILED: 'Fallida',
  CANCELLED: 'Cancelada',
}

const styles: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PUBLISHED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-200 text-gray-600',
  PROCESSING: 'bg-blue-100 text-blue-800',
  AI_GENERATED: 'bg-purple-100 text-purple-800',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-200 text-gray-600',
}

export function StatusBadge({ status }: { status: RubricStatus | EvaluationStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {labels[status] ?? status}
    </span>
  )
}

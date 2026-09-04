export function scoreLevelLabel(score: number, max: number): string {
  const pct = max > 0 ? (score / max) * 100 : 0
  if (pct >= 90) return 'Excelente'
  if (pct >= 80) return 'Muy bueno'
  if (pct >= 70) return 'Bueno'
  if (pct >= 60) return 'Satisfactorio'
  return 'Insuficiente'
}

const COLORS: Record<string, string> = {
  Excelente: 'text-emerald-600 bg-emerald-50',
  'Muy bueno': 'text-indigo-600 bg-indigo-50',
  Bueno: 'text-amber-600 bg-amber-50',
  Satisfactorio: 'text-amber-600 bg-amber-50',
  Insuficiente: 'text-red-600 bg-red-50',
}

export function ScoreLevelPill({ score, max }: { score: number; max: number }) {
  const label = scoreLevelLabel(score, max)
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[label]}`}>
      {label}
    </span>
  )
}

import type { Evaluation } from '../types'
import { ScoreLevelPill } from './ScoreLevel'

export function EvaluationSummaryCard({ evaluation }: { evaluation: Evaluation }) {
  const max = evaluation.final_max_score ?? 100
  const score = evaluation.final_total_score ?? 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-500">Calificacion total</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-gray-900">{score}</span>
        <span className="text-lg text-gray-400">/ {max}</span>
      </div>
      <div className="mt-2">
        <ScoreLevelPill score={score} max={max} />
      </div>
    </div>
  )
}

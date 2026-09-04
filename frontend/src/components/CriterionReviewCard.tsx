import type { CriterionResult } from '../types'
import { ScoreEditor } from './ScoreEditor'

interface CriterionReviewCardProps {
  result: CriterionResult
  maxScore: number
  levelName: string | null
  readOnly: boolean
  onScoreChange: (value: number) => void
  onFeedbackChange: (value: string) => void
}

export function CriterionReviewCard({
  result,
  maxScore,
  levelName,
  readOnly,
  onScoreChange,
  onFeedbackChange,
}: CriterionReviewCardProps) {
  return (
    <article className="rounded border border-gray-200 bg-white p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">{result.criterion_name}</h3>
          <p className="text-xs text-gray-500">
            Peso {result.weight}% · Nivel sugerido: {levelName ?? 'sin nivel'} · Puntaje ponderado{' '}
            {result.weighted_score}
          </p>
        </div>
        <ScoreEditor
          value={result.final_score}
          max={maxScore}
          disabled={readOnly}
          onChange={onScoreChange}
        />
      </header>

      {result.modified_by_teacher && (
        <p className="mt-2 text-xs font-medium text-amber-700">
          Modificado por el docente (la IA sugirio {result.ai_suggested_score}).
        </p>
      )}

      <label className="mt-3 block text-sm">
        <span className="text-gray-600">Retroalimentacion</span>
        <textarea
          value={result.final_feedback}
          disabled={readOnly}
          rows={3}
          onChange={(event) => onFeedbackChange(event.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </label>

      {result.evidence.length > 0 && (
        <details className="mt-2 text-sm text-gray-600">
          <summary className="cursor-pointer">Evidencia citada por la IA</summary>
          <ul className="mt-1 list-disc pl-5">
            {result.evidence.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </details>
      )}

      {result.improvement_suggestion && (
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium">Sugerencia de mejora: </span>
          {result.improvement_suggestion}
        </p>
      )}
    </article>
  )
}

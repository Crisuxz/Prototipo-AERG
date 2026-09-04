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
    <tr className="border-t border-gray-100 align-top">
      <td className="px-4 py-4">
        <p className="font-medium text-gray-900">{result.criterion_name}</p>
        <p className="mt-0.5 text-xs text-gray-400">Peso {result.weight}%</p>
        {result.modified_by_teacher && (
          <p className="mt-1 text-xs font-medium text-amber-600">
            Modificado (IA sugirio {result.ai_suggested_score})
          </p>
        )}
      </td>
      <td className="px-4 py-4">
        <span className="inline-block rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
          {levelName ?? 'Sin nivel'}
        </span>
      </td>
      <td className="px-4 py-4">
        <ScoreEditor value={result.final_score} max={maxScore} disabled={readOnly} onChange={onScoreChange} />
        <p className="mt-1 text-xs text-gray-400">Ponderado {result.weighted_score}</p>
      </td>
      <td className="min-w-64 px-4 py-4">
        <textarea
          value={result.final_feedback}
          disabled={readOnly}
          rows={3}
          onChange={(event) => onFeedbackChange(event.target.value)}
          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
        />
        {result.evidence.length > 0 && (
          <details className="mt-2 text-xs text-gray-500">
            <summary className="cursor-pointer">Evidencia citada por la IA</summary>
            <ul className="mt-1 list-disc pl-4">
              {result.evidence.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </details>
        )}
        {result.improvement_suggestion && (
          <p className="mt-2 text-xs text-gray-500">
            <span className="font-medium text-gray-600">Sugerencia: </span>
            {result.improvement_suggestion}
          </p>
        )}
      </td>
    </tr>
  )
}

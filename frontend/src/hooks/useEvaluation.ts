import { useCallback } from 'react'

import { evaluationsApi, type EvaluationFilters } from '../services/evaluationsApi'
import type { EvaluationDetail, EvaluationSummary } from '../types'
import { useAsyncData } from './useAsyncData'

export function useEvaluation(id: number | null) {
  const loader = useCallback(() => evaluationsApi.get(id as number), [id])
  return useAsyncData<EvaluationDetail>(loader, id !== null)
}

export function useEvaluations(filters: EvaluationFilters = {}) {
  const { status, rubric_id: rubricId, from, to } = filters
  const loader = useCallback(
    () => evaluationsApi.list({ status, rubric_id: rubricId, from, to }),
    [status, rubricId, from, to],
  )
  return useAsyncData<EvaluationSummary[]>(loader)
}

import { useCallback } from 'react'

import { rubricsApi, type RubricFilters } from '../services/rubricsApi'
import type { Rubric, RubricListItem } from '../types'
import { useAsyncData } from './useAsyncData'

export function useRubrics(filters: RubricFilters = {}) {
  const { status, search } = filters
  const loader = useCallback(
    () => rubricsApi.list({ status, search: search || undefined }),
    [status, search],
  )
  return useAsyncData<RubricListItem[]>(loader)
}

export function useRubric(id: number | null) {
  const loader = useCallback(() => rubricsApi.get(id as number), [id])
  return useAsyncData<Rubric>(loader, id !== null)
}

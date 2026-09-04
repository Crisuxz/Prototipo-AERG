import type {
  Evaluation,
  EvaluationDetail,
  EvaluationReviewInput,
  EvaluationStatus,
  EvaluationSummary,
} from '../types'
import { apiClient } from './apiClient'

export interface EvaluationFilters {
  status?: EvaluationStatus
  rubric_id?: number
  from?: string
  to?: string
}

export const evaluationsApi = {
  async list(filters: EvaluationFilters = {}): Promise<EvaluationSummary[]> {
    const { data } = await apiClient.get<EvaluationSummary[]>('/evaluations', { params: filters })
    return data
  },
  async get(id: number): Promise<EvaluationDetail> {
    const { data } = await apiClient.get<EvaluationDetail>(`/evaluations/${id}`)
    return data
  },
  async create(
    submissionId: number,
    rubricId: number,
    teacherInstructions: string | null,
  ): Promise<Evaluation> {
    const { data } = await apiClient.post<Evaluation>('/evaluations', {
      submission_id: submissionId,
      rubric_id: rubricId,
      teacher_instructions: teacherInstructions,
    })
    return data
  },
  async regenerate(id: number, teacherInstructions: string | null): Promise<Evaluation> {
    const { data } = await apiClient.post<Evaluation>(`/evaluations/${id}/regenerate`, {
      teacher_instructions: teacherInstructions,
    })
    return data
  },
  async review(id: number, payload: EvaluationReviewInput): Promise<Evaluation> {
    const { data } = await apiClient.put<Evaluation>(`/evaluations/${id}/review`, payload)
    return data
  },
  async approve(id: number): Promise<Evaluation> {
    const { data } = await apiClient.post<Evaluation>(`/evaluations/${id}/approve`)
    return data
  },
}

import type { Rubric, RubricInput, RubricListItem, RubricStatus } from '../types'
import { apiClient } from './apiClient'

export interface RubricFilters {
  status?: RubricStatus
  search?: string
}

export const rubricsApi = {
  async list(filters: RubricFilters = {}): Promise<RubricListItem[]> {
    const { data } = await apiClient.get<RubricListItem[]>('/rubrics', { params: filters })
    return data
  },
  async get(id: number): Promise<Rubric> {
    const { data } = await apiClient.get<Rubric>(`/rubrics/${id}`)
    return data
  },
  async create(payload: RubricInput): Promise<Rubric> {
    const { data } = await apiClient.post<Rubric>('/rubrics', payload)
    return data
  },
  async update(id: number, payload: RubricInput): Promise<Rubric> {
    const { data } = await apiClient.put<Rubric>(`/rubrics/${id}`, payload)
    return data
  },
  async publish(id: number): Promise<Rubric> {
    const { data } = await apiClient.post<Rubric>(`/rubrics/${id}/publish`)
    return data
  },
  async archive(id: number): Promise<Rubric> {
    const { data } = await apiClient.post<Rubric>(`/rubrics/${id}/archive`)
    return data
  },
  async remove(id: number): Promise<void> {
    await apiClient.delete(`/rubrics/${id}`)
  },
}

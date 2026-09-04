import type { Submission } from '../types'
import { apiClient } from './apiClient'

export const submissionsApi = {
  async upload(file: File, studentIdentifier: string): Promise<Submission> {
    const form = new FormData()
    form.append('file', file)
    form.append('student_identifier', studentIdentifier)
    const { data } = await apiClient.post<Submission>('/submissions', form)
    return data
  },
  async get(id: number): Promise<Submission> {
    const { data } = await apiClient.get<Submission>(`/submissions/${id}`)
    return data
  },
  async list(): Promise<Submission[]> {
    const { data } = await apiClient.get<Submission[]>('/submissions')
    return data
  },
}

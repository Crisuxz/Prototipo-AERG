import type { Incident } from '../types'
import { apiClient } from './apiClient'

export const incidentsApi = {
  async list(): Promise<Incident[]> {
    const { data } = await apiClient.get<Incident[]>('/incidents')
    return data
  },
}

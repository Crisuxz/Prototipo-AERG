import axios, { type AxiosError } from 'axios'

export interface ApiError {
  code: string
  message: string
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: ApiError }>) => {
    const apiError: ApiError = error.response?.data?.error ?? {
      code: 'NETWORK_ERROR',
      message: 'No fue posible comunicarse con el servidor.',
    }
    return Promise.reject(apiError)
  },
)

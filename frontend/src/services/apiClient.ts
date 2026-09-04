import axios, { type AxiosError } from 'axios'

export interface ApiError {
  code: string
  message: string
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
})

// Autenticacion de prototipo (D8): un unico token de sesion local para el docente de prueba.
apiClient.interceptors.request.use((config) => {
  const token = import.meta.env.VITE_API_TOKEN ?? 'prototipo-dev-token'
  config.headers.set('Authorization', `Bearer ${token}`)
  return config
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

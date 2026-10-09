import axios, { type AxiosError } from 'axios'

export interface ApiError {
  code: string
  message: string
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
})

// Tras un launch LTI 1.3 el backend redirige con `#session_token=...` (RS-01): se guarda en
// sessionStorage y se retira de la URL para que no quede en el historial.
const SESSION_KEY = 'aerg_session_token'
const launchToken = new URLSearchParams(window.location.hash.slice(1)).get('session_token')
if (launchToken) {
  sessionStorage.setItem(SESSION_KEY, launchToken)
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

// Sin sesion LTI se conserva la autenticacion de prototipo (D8): el token compartido.
apiClient.interceptors.request.use((config) => {
  const token =
    sessionStorage.getItem(SESSION_KEY) ?? import.meta.env.VITE_API_TOKEN ?? 'prototipo-dev-token'
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

import { useCallback, useEffect, useState } from 'react'

import type { ApiError } from '../services/apiClient'

/** Estados explicitos que toda pantalla que consume la API debe manejar (Parte 51). */
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty'

export interface AsyncData<T> {
  data: T | null
  status: RequestStatus
  error: ApiError | null
  reload: () => Promise<void>
  setData: (value: T | null) => void
}

const isEmptyValue = (value: unknown) => Array.isArray(value) && value.length === 0

export function useAsyncData<T>(loader: () => Promise<T>, enabled = true): AsyncData<T> {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<RequestStatus>('idle')
  const [error, setError] = useState<ApiError | null>(null)

  const reload = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const result = await loader()
      setData(result)
      setStatus(isEmptyValue(result) ? 'empty' : 'success')
    } catch (apiError) {
      setError(apiError as ApiError)
      setStatus('error')
    }
  }, [loader])

  useEffect(() => {
    if (enabled) {
      void reload()
    } else {
      setStatus('idle')
    }
  }, [enabled, reload])

  return { data, status, error, reload, setData }
}

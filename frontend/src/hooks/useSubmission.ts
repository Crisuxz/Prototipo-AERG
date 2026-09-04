import { useState } from 'react'

import type { ApiError } from '../services/apiClient'
import { submissionsApi } from '../services/submissionsApi'
import type { Submission } from '../types'
import type { RequestStatus } from './useAsyncData'

/** Subida de un trabajo con los mismos estados explicitos que el resto de la app. */
export function useSubmission() {
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [status, setStatus] = useState<RequestStatus>('idle')
  const [error, setError] = useState<ApiError | null>(null)

  const upload = async (file: File, studentIdentifier: string) => {
    setStatus('loading')
    setError(null)
    try {
      const created = await submissionsApi.upload(file, studentIdentifier)
      setSubmission(created)
      setStatus('success')
      return created
    } catch (apiError) {
      setError(apiError as ApiError)
      setStatus('error')
      return null
    }
  }

  const reset = () => {
    setSubmission(null)
    setStatus('idle')
    setError(null)
  }

  return { submission, status, error, upload, reset }
}

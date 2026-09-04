import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EmptyState } from '../components/EmptyState'
import { FileUploader } from '../components/FileUploader'
import { Loader } from '../components/Loader'
import { useToast } from '../components/ToastNotifications'
import { useRubrics } from '../hooks/useRubrics'
import { useSubmission } from '../hooks/useSubmission'
import type { ApiError } from '../services/apiClient'
import { evaluationsApi } from '../services/evaluationsApi'

export function EvaluateWorkPage() {
  const navigate = useNavigate()
  const { notify, notifyError } = useToast()
  const rubrics = useRubrics({ status: 'PUBLISHED' })
  const submission = useSubmission()

  const [file, setFile] = useState<File | null>(null)
  const [student, setStudent] = useState('')
  const [rubricId, setRubricId] = useState<number | ''>('')
  const [instructions, setInstructions] = useState('')
  const [evaluating, setEvaluating] = useState(false)

  const evaluate = async () => {
    if (!file || rubricId === '') return
    const created = await submission.upload(file, student || 'Estudiante sin identificar')
    if (!created) {
      if (submission.error) notifyError(submission.error)
      return
    }

    setEvaluating(true)
    try {
      const evaluation = await evaluationsApi.create(created.id, rubricId, instructions || null)
      notify('Propuesta generada: revisala antes de aprobar.', 'success')
      navigate(`/evaluaciones/${evaluation.id}/revision`)
    } catch (apiError) {
      notifyError(apiError as ApiError)
    } finally {
      setEvaluating(false)
    }
  }

  const busy = submission.status === 'loading' || evaluating

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold">Evaluar trabajo</h2>
      <p className="mt-1 text-sm text-gray-600">
        La IA propone una evaluacion; tu la revisas y decides antes de aprobarla.
      </p>

      <ol className="mt-6 space-y-5">
        <li>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">1. Trabajo del estudiante</h3>
          <FileUploader file={file} onSelect={setFile} disabled={busy} />
          <label className="mt-3 block text-sm">
            <span className="text-gray-600">Identificador del estudiante</span>
            <input
              value={student}
              disabled={busy}
              placeholder="Nombre o matricula"
              onChange={(event) => setStudent(event.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </label>
        </li>

        <li>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">2. Rubrica</h3>
          {rubrics.status === 'loading' && <Loader label="Cargando rubricas publicadas..." />}
          {rubrics.status === 'empty' && (
            <EmptyState
              title="No hay rubricas publicadas"
              description="Publica una rubrica antes de evaluar."
              action={
                <button
                  type="button"
                  onClick={() => navigate('/rubricas')}
                  className="rounded bg-purple-700 px-3 py-1.5 text-sm font-medium text-white"
                >
                  Ir a rubricas
                </button>
              }
            />
          )}
          {rubrics.status === 'success' && rubrics.data && (
            <select
              value={rubricId}
              disabled={busy}
              onChange={(event) => setRubricId(Number(event.target.value))}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">Selecciona una rubrica</option>
              {rubrics.data.map((rubric) => (
                <option key={rubric.id} value={rubric.id}>
                  {rubric.name} (v{rubric.version}, {rubric.criteria_count} criterios)
                </option>
              ))}
            </select>
          )}
        </li>

        <li>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            3. Instrucciones adicionales (opcional)
          </h3>
          <textarea
            value={instructions}
            disabled={busy}
            rows={3}
            placeholder="Por ejemplo: se estricto con el uso de citas."
            onChange={(event) => setInstructions(event.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </li>
      </ol>

      <button
        type="button"
        disabled={busy || !file || rubricId === ''}
        onClick={evaluate}
        className="mt-6 rounded bg-purple-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Generando propuesta...' : 'Evaluar con IA'}
      </button>
      {busy && <Loader label="La IA esta analizando el trabajo. Esto puede tardar unos segundos." />}
    </div>
  )
}

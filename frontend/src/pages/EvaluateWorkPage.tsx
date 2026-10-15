import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { FileUploader } from '../components/FileUploader'
import { ChevronDownIcon } from '../components/icons'
import { Loader } from '../components/Loader'
import { useToast } from '../components/ToastNotifications'
import { usePageTitle } from '../hooks/usePageTitle'
import { useRubrics } from '../hooks/useRubrics'
import { useSubmission } from '../hooks/useSubmission'
import type { ApiError } from '../services/apiClient'
import { evaluationsApi } from '../services/evaluationsApi'

export function EvaluateWorkPage() {
  usePageTitle('Evaluar trabajo')
  const navigate = useNavigate()
  const { notify, notifyError } = useToast()
  const rubrics = useRubrics({ status: 'PUBLISHED' })
  const submission = useSubmission()

  const [file, setFile] = useState<File | null>(null)
  const [student, setStudent] = useState('')
  const [rubricId, setRubricId] = useState<number | ''>('')
  const [instructions, setInstructions] = useState('')
  const [evaluating, setEvaluating] = useState(false)

  const evaluate = async (event: FormEvent) => {
    event.preventDefault()
    if (!file || rubricId === '') return
    try {
      const created = await submission.upload(file, student.trim() || 'Estudiante sin identificar')
      setEvaluating(true)
      const evaluation = await evaluationsApi.create(created.id, rubricId, instructions || null)
      notify('Propuesta generada: revísala antes de aprobar.', 'success')
      navigate(`/evaluaciones/${evaluation.id}/revision`)
    } catch (apiError) {
      notifyError(apiError as ApiError)
    } finally {
      setEvaluating(false)
    }
  }

  const uploading = submission.status === 'loading'
  const busy = uploading || evaluating
  const selectedRubric = (rubrics.data ?? []).find((rubric) => rubric.id === rubricId)

  // Explica por que el boton principal esta deshabilitado en lugar de dejar al docente adivinando.
  const missing = [!file && 'un archivo', rubricId === '' && 'una rúbrica'].filter(Boolean)

  return (
    <form className="max-w-3xl" onSubmit={evaluate} aria-busy={busy}>
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Evaluar nuevo trabajo</h1>
        <p className="mt-1 text-sm text-gray-600">
          Selecciona el trabajo académico y la rúbrica que se utilizará para generar la evaluación.
        </p>
      </header>

      <fieldset disabled={busy} className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">
          1. Seleccionar trabajo <span className="font-normal text-red-700">*</span>
        </h2>
        <div className="mt-3">
          <FileUploader file={file} onSelect={setFile} disabled={busy} />
        </div>
        <label className="mt-3 block text-sm">
          <span className="text-gray-700">Identificador del estudiante (opcional)</span>
          <input
            value={student}
            autoComplete="off"
            placeholder="Nombre o matrícula"
            onChange={(event) => setStudent(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-500 focus:border-indigo-500"
          />
        </label>
      </fieldset>

      <fieldset disabled={busy} className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">
          2. Seleccionar rúbrica <span className="font-normal text-red-700">*</span>
        </h2>
        <div className="mt-3">
          {rubrics.status === 'loading' && <Loader label="Cargando rúbricas publicadas..." />}
          {rubrics.status === 'error' && <ErrorMessage message={rubrics.error?.message} onRetry={rubrics.reload} />}
          {rubrics.status === 'empty' && (
            <EmptyState
              title="No hay rúbricas publicadas"
              description="Publica una rúbrica antes de evaluar."
              action={
                <Link
                  to="/rubricas"
                  className="inline-flex rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Ir a rúbricas
                </Link>
              }
            />
          )}
          {rubrics.status === 'success' && rubrics.data && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-64 flex-1">
                <span className="sr-only">Rúbrica</span>
                <select
                  value={rubricId}
                  required
                  aria-describedby="rubric-hint"
                  onChange={(event) => setRubricId(event.target.value === '' ? '' : Number(event.target.value))}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm focus:border-indigo-500"
                >
                  <option value="">Selecciona una rúbrica</option>
                  {rubrics.data.map((rubric) => (
                    <option key={rubric.id} value={rubric.id}>
                      {rubric.name} (v{rubric.version}, {rubric.criteria_count} criterios)
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              </label>
              {selectedRubric && (
                <Link
                  to={`/rubricas/${selectedRubric.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Ver rúbrica
                  <span className="sr-only"> (se abre en una pestaña nueva)</span>
                </Link>
              )}
            </div>
          )}
          <p id="rubric-hint" className="mt-2 text-xs text-gray-600">
            La rúbrica define los criterios, niveles y ponderaciones que se usarán para evaluar el trabajo.
          </p>
        </div>
      </fieldset>

      <fieldset disabled={busy} className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <label className="block">
          <span className="text-sm font-semibold text-gray-900">3. Instrucciones adicionales (opcional)</span>
          <textarea
            value={instructions}
            rows={3}
            placeholder="Por ejemplo: sé estricto con el uso de citas."
            onChange={(event) => setInstructions(event.target.value)}
            className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-500 focus:border-indigo-500"
          />
        </label>
      </fieldset>

      <div className="mt-6 text-center">
        <button
          type="submit"
          disabled={busy || !file || rubricId === ''}
          aria-describedby="submit-hint"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {uploading ? 'Subiendo trabajo...' : evaluating ? 'Generando propuesta...' : 'Continuar'}
        </button>
        <p id="submit-hint" className="mt-2 text-xs text-gray-600">
          {missing.length > 0 && !busy
            ? `Para continuar selecciona ${missing.join(' y ')}.`
            : 'Se generará una propuesta de evaluación utilizando IA. Podrás revisarla antes de aprobar.'}
        </p>
        {busy && (
          <div className="flex justify-center">
            <Loader
              label={
                uploading
                  ? 'Subiendo y leyendo el documento...'
                  : 'La IA está analizando el trabajo. Esto puede tardar hasta un minuto; no cierres esta página.'
              }
            />
          </div>
        )}
      </div>
    </form>
  )
}

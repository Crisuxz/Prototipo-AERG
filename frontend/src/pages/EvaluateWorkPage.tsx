import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EmptyState } from '../components/EmptyState'
import { FileUploader } from '../components/FileUploader'
import { BellIcon, ChevronDownIcon } from '../components/icons'
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
  const selectedRubric = (rubrics.data ?? []).find((rubric) => rubric.id === rubricId)

  return (
    <div className="max-w-3xl">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Evaluar nuevo trabajo</h2>
          <p className="mt-1 text-sm text-gray-500">
            Selecciona el trabajo academico y la rubrica que se utilizara para generar la evaluacion.
          </p>
        </div>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        >
          <BellIcon className="h-5 w-5" />
        </button>
      </header>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">1. Seleccionar trabajo</h3>
        <div className="mt-3">
          <FileUploader file={file} onSelect={setFile} disabled={busy} />
        </div>
        <label className="mt-3 block text-sm">
          <span className="text-gray-600">Identificador del estudiante</span>
          <input
            value={student}
            disabled={busy}
            placeholder="Nombre o matricula"
            onChange={(event) => setStudent(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </label>
        <p className="mt-2 text-xs text-gray-400">Formatos permitidos: .docx, .pdf, .txt | Tamano maximo 10 MB</p>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">2. Seleccionar rubrica</h3>
        <div className="mt-3">
          {rubrics.status === 'loading' && <Loader label="Cargando rubricas publicadas..." />}
          {rubrics.status === 'empty' && (
            <EmptyState
              title="No hay rubricas publicadas"
              description="Publica una rubrica antes de evaluar."
              action={
                <button
                  type="button"
                  onClick={() => navigate('/rubricas')}
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Ir a rubricas
                </button>
              }
            />
          )}
          {rubrics.status === 'success' && rubrics.data && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-64 flex-1">
                <select
                  value={rubricId}
                  disabled={busy}
                  onChange={(event) => setRubricId(Number(event.target.value))}
                  className="w-full appearance-none rounded-lg border border-gray-200 px-3 py-2 pr-9 text-sm focus:border-indigo-400 focus:outline-none"
                >
                  <option value="">Selecciona una rubrica</option>
                  {rubrics.data.map((rubric) => (
                    <option key={rubric.id} value={rubric.id}>
                      {rubric.name} (v{rubric.version}, {rubric.criteria_count} criterios)
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </label>
              <button
                type="button"
                disabled={!selectedRubric}
                onClick={() => selectedRubric && navigate(`/rubricas/${selectedRubric.id}`)}
                className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Ver rubrica
              </button>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-400">
            La rubrica define los criterios, niveles y ponderaciones que se usaran para evaluar el trabajo.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900">3. Instrucciones adicionales (opcional)</h3>
        <textarea
          value={instructions}
          disabled={busy}
          rows={3}
          placeholder="Por ejemplo: se estricto con el uso de citas."
          onChange={(event) => setInstructions(event.target.value)}
          className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          disabled={busy || !file || rubricId === ''}
          onClick={evaluate}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Generando propuesta...' : 'Continuar'}
        </button>
        <p className="mt-2 text-xs text-gray-400">Se generara una propuesta de evaluacion utilizando IA.</p>
        {busy && <Loader label="La IA esta analizando el trabajo. Esto puede tardar unos segundos." />}
      </div>
    </div>
  )
}

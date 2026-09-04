import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { CriterionReviewCard } from '../components/CriterionReviewCard'
import { EvaluationSummaryCard } from '../components/EvaluationSummaryCard'
import { ArrowLeftIcon, InfoIcon } from '../components/icons'
import { Loader } from '../components/Loader'
import { useToast } from '../components/ToastNotifications'
import { useEvaluation } from '../hooks/useEvaluation'
import type { ApiError } from '../services/apiClient'
import { evaluationsApi } from '../services/evaluationsApi'
import type { CriterionResult, RubricSnapshot } from '../types'

const maxScoreOf = (snapshot: RubricSnapshot, criterionId: number) => {
  const criterion = snapshot.criteria.find((item) => item.id === criterionId)
  return criterion ? Math.max(...criterion.levels.map((level) => level.score)) : 0
}

const levelNameOf = (snapshot: RubricSnapshot, criterionId: number, levelId: number | null) => {
  const criterion = snapshot.criteria.find((item) => item.id === criterionId)
  return criterion?.levels.find((level) => level.id === levelId)?.name ?? null
}

export function ReviewEvaluationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const evaluationId = Number(id)
  const { notify, notifyError } = useToast()
  const { data, status, error, reload } = useEvaluation(evaluationId)

  const [results, setResults] = useState<CriterionResult[]>([])
  const [generalFeedback, setGeneralFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmApprove, setConfirmApprove] = useState(false)

  useEffect(() => {
    if (!data) return
    setResults(data.criterion_results)
    setGeneralFeedback(data.general_feedback ?? '')
  }, [data])

  if (status === 'loading') return <Loader label="Cargando evaluacion..." />
  if (status === 'error') return <p className="text-sm text-red-600">{error?.message}</p>
  if (!data) return null

  const readOnly = data.status === 'APPROVED'
  const snapshot = data.rubric_version_snapshot

  const updateResult = (criterionId: number, patch: Partial<CriterionResult>) => {
    setResults(
      results.map((result) =>
        result.criterion_id === criterionId ? { ...result, ...patch } : result,
      ),
    )
  }

  const saveReview = async () => {
    setBusy(true)
    try {
      await evaluationsApi.review(evaluationId, {
        criteria: results.map((result) => ({
          criterion_id: result.criterion_id,
          final_score: result.final_score,
          final_feedback: result.final_feedback,
        })),
        general_feedback: generalFeedback,
      })
      notify('Cambios guardados.', 'success')
      await reload()
    } catch (apiError) {
      notifyError(apiError as ApiError)
    } finally {
      setBusy(false)
    }
  }

  const regenerate = async () => {
    setBusy(true)
    try {
      await evaluationsApi.regenerate(evaluationId, data.teacher_instructions)
      notify('Se genero una nueva propuesta; la anterior queda en el historial.', 'success')
      await reload()
    } catch (apiError) {
      notifyError(apiError as ApiError)
    } finally {
      setBusy(false)
    }
  }

  const approve = async () => {
    setConfirmApprove(false)
    setBusy(true)
    try {
      await saveReview()
      await evaluationsApi.approve(evaluationId)
      notify('Evaluacion aprobada y enviada al LMS.', 'success')
      await reload()
    } catch (apiError) {
      notifyError(apiError as ApiError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-6xl">
      <button
        type="button"
        onClick={() => navigate('/evaluar')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver a seleccion
      </button>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-gray-900">Revision de evaluacion</h2>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
              Propuesta por IA
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {data.submission.student_identifier} · {data.submission.original_filename} · {snapshot.name} (v
            {snapshot.version})
          </p>
        </div>
        <button
          type="button"
          disabled={busy || readOnly}
          onClick={regenerate}
          className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Solicitar nueva evaluacion
        </button>
      </header>

      {data.status === 'FAILED' && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          La generacion fallo y no hay propuesta que revisar. Puedes intentar regenerarla.
        </p>
      )}

      <p className="mt-4 text-sm text-gray-500">Revisa y modifica antes de aprobar. Los cambios realizados seran los que se envien a la plataforma educativa.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[16rem_1fr]">
        <EvaluationSummaryCard evaluation={data} />

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-500">Observaciones generales</h3>
          <textarea
            value={generalFeedback}
            disabled={readOnly}
            rows={4}
            onChange={(event) => setGeneralFeedback(event.target.value)}
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </div>
      </div>

      <h3 className="mt-6 font-semibold text-gray-900">Detalle por criterio</h3>
      <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="text-left text-xs font-medium uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-3">Criterio</th>
              <th className="px-4 py-3">Nivel alcanzado</th>
              <th className="px-4 py-3">Puntos</th>
              <th className="px-4 py-3">Retroalimentacion</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <CriterionReviewCard
                key={result.id}
                result={result}
                readOnly={readOnly}
                maxScore={maxScoreOf(snapshot, result.criterion_id)}
                levelName={levelNameOf(snapshot, result.criterion_id, result.selected_level_id)}
                onScoreChange={(value) => updateResult(result.criterion_id, { final_score: value })}
                onFeedbackChange={(value) =>
                  updateResult(result.criterion_id, { final_feedback: value })
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {data.generations.length > 1 || data.revisions.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <h3 className="font-semibold text-gray-900">Generaciones de IA</h3>
            <ul className="mt-2 space-y-1 text-gray-500">
              {data.generations.map((generation) => (
                <li key={generation.id}>
                  #{generation.generation_number} · {generation.validation_status} · {generation.model_name}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <h3 className="font-semibold text-gray-900">Cambios del docente</h3>
            {data.revisions.length === 0 ? (
              <p className="mt-2 text-gray-400">Aun no hay modificaciones registradas.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-gray-500">
                {data.revisions.map((revision) => (
                  <li key={revision.id}>
                    {revision.field_changed}: {revision.previous_value} to {revision.new_value}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5">
        <button
          type="button"
          onClick={() => navigate('/evaluar')}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <InfoIcon className="h-4 w-4 shrink-0 text-gray-400" />
          La evaluacion se enviara a la plataforma educativa solo despues de aprobar.
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || readOnly}
            onClick={saveReview}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Guardar cambios
          </button>
          <button
            type="button"
            disabled={busy || readOnly || data.status === 'FAILED'}
            onClick={() => setConfirmApprove(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Aprobar y enviar
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmApprove}
        title="Aprobar evaluacion"
        message="Al aprobar, la evaluacion queda congelada y se envia al LMS configurado. Deseas continuar?"
        confirmLabel="Aprobar"
        onConfirm={approve}
        onCancel={() => setConfirmApprove(false)}
      />
    </div>
  )
}

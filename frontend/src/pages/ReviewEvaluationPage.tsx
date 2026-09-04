import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { CriterionReviewCard } from '../components/CriterionReviewCard'
import { EvaluationSummaryCard } from '../components/EvaluationSummaryCard'
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
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div>
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Revision de evaluacion</h2>
            <p className="text-sm text-gray-600">
              {data.submission.student_identifier} · {data.submission.original_filename} ·{' '}
              {snapshot.name} (v{snapshot.version})
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || readOnly}
              onClick={regenerate}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Regenerar
            </button>
            <button
              type="button"
              disabled={busy || readOnly}
              onClick={saveReview}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Guardar cambios
            </button>
            <button
              type="button"
              disabled={busy || readOnly || data.status === 'FAILED'}
              onClick={() => setConfirmApprove(true)}
              className="rounded bg-purple-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Aprobar
            </button>
          </div>
        </header>

        {data.status === 'FAILED' && (
          <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            La generacion fallo y no hay propuesta que revisar. Puedes intentar regenerarla.
          </p>
        )}

        <div className="mt-4 space-y-3">
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
        </div>

        <label className="mt-4 block text-sm">
          <span className="font-medium text-gray-700">Retroalimentacion general</span>
          <textarea
            value={generalFeedback}
            disabled={readOnly}
            rows={4}
            onChange={(event) => setGeneralFeedback(event.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
      </div>

      <div className="space-y-4">
        <EvaluationSummaryCard
          evaluation={data}
          studentIdentifier={data.submission.student_identifier}
          rubricName={snapshot.name}
        />

        <section className="rounded border border-gray-200 bg-white p-4 text-sm">
          <h3 className="font-semibold">Generaciones de IA</h3>
          <ul className="mt-2 space-y-1 text-gray-600">
            {data.generations.map((generation) => (
              <li key={generation.id}>
                #{generation.generation_number} · {generation.validation_status} ·{' '}
                {generation.model_name} · prompt {generation.prompt_version}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded border border-gray-200 bg-white p-4 text-sm">
          <h3 className="font-semibold">Cambios del docente</h3>
          {data.revisions.length === 0 ? (
            <p className="mt-2 text-gray-500">Aun no hay modificaciones registradas.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-gray-600">
              {data.revisions.map((revision) => (
                <li key={revision.id}>
                  {revision.field_changed}: {revision.previous_value} → {revision.new_value}
                </li>
              ))}
            </ul>
          )}
        </section>
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

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { CriterionReviewCard } from '../components/CriterionReviewCard'
import { ErrorMessage } from '../components/ErrorMessage'
import { EvaluationSummaryCard } from '../components/EvaluationSummaryCard'
import { ArrowLeftIcon, InfoIcon } from '../components/icons'
import { Loader } from '../components/Loader'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/ToastNotifications'
import { useEvaluation } from '../hooks/useEvaluation'
import { usePageTitle } from '../hooks/usePageTitle'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import type { ApiError } from '../services/apiClient'
import { evaluationsApi } from '../services/evaluationsApi'
import type { CriterionResult, RevisionField, RubricSnapshot } from '../types'
import { isScoreValid } from '../utils/score'

const maxScoreOf = (snapshot: RubricSnapshot, criterionId: number) => {
  const criterion = snapshot.criteria.find((item) => item.id === criterionId)
  return criterion ? Math.max(...criterion.levels.map((level) => level.score)) : 0
}

const levelNameOf = (snapshot: RubricSnapshot, criterionId: number, levelId: number | null) => {
  const criterion = snapshot.criteria.find((item) => item.id === criterionId)
  return criterion?.levels.find((level) => level.id === levelId)?.name ?? null
}

const REVISION_LABELS: Record<RevisionField, string> = {
  SCORE: 'Puntaje',
  FEEDBACK: 'Retroalimentación',
  GENERAL_FEEDBACK: 'Observaciones generales',
  LEVEL: 'Nivel',
}

type BusyAction = 'save' | 'regenerate' | 'approve' | null

export function ReviewEvaluationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const evaluationId = Number(id)
  const { notify, notifyError } = useToast()
  const { data, status, error, reload } = useEvaluation(evaluationId)
  usePageTitle('Revisión de evaluación')

  const [results, setResults] = useState<CriterionResult[]>([])
  const [generalFeedback, setGeneralFeedback] = useState('')
  const [busy, setBusy] = useState<BusyAction>(null)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  useEffect(() => {
    if (!data) return
    setResults(data.criterion_results)
    setGeneralFeedback(data.general_feedback ?? '')
  }, [data])

  const dirty =
    !!data &&
    (generalFeedback !== (data.general_feedback ?? '') ||
      results.some((result) => {
        const original = data.criterion_results.find((item) => item.id === result.id)
        return (
          !original ||
          original.final_score !== result.final_score ||
          original.final_feedback !== result.final_feedback
        )
      }))
  const { blocker } = useUnsavedChanges(dirty)

  if (status === 'loading' && !data) return <Loader label="Cargando evaluación..." />
  if (status === 'error') return <ErrorMessage message={error?.message} onRetry={reload} />
  if (!data) return null

  const readOnly = data.status === 'APPROVED'
  const snapshot = data.rubric_version_snapshot
  const hasInvalidScore = results.some(
    (result) => !isScoreValid(result.final_score, maxScoreOf(snapshot, result.criterion_id)),
  )

  // Vuelve a la pantalla de origen (historial, inicio...) en lugar de forzar /evaluar.
  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
    else navigate('/historial')
  }

  const updateResult = (criterionId: number, patch: Partial<CriterionResult>) => {
    setResults(
      results.map((result) =>
        result.criterion_id === criterionId ? { ...result, ...patch } : result,
      ),
    )
  }

  /** Devuelve false si falla, para que la aprobacion no continue con datos sin guardar. */
  const persistReview = async (): Promise<boolean> => {
    try {
      await evaluationsApi.review(evaluationId, {
        criteria: results.map((result) => ({
          criterion_id: result.criterion_id,
          final_score: result.final_score,
          final_feedback: result.final_feedback,
        })),
        general_feedback: generalFeedback,
      })
      return true
    } catch (apiError) {
      notifyError(apiError as ApiError)
      return false
    }
  }

  const saveReview = async () => {
    setBusy('save')
    if (await persistReview()) {
      notify('Cambios guardados.', 'success')
      await reload()
    }
    setBusy(null)
  }

  const regenerate = async () => {
    setConfirmRegenerate(false)
    setBusy('regenerate')
    try {
      await evaluationsApi.regenerate(evaluationId, data.teacher_instructions)
      notify('Se generó una nueva propuesta; la anterior queda en el historial.', 'success')
      await reload()
    } catch (apiError) {
      notifyError(apiError as ApiError)
    } finally {
      setBusy(null)
    }
  }

  const approve = async () => {
    setConfirmApprove(false)
    setBusy('approve')
    try {
      if (dirty && !(await persistReview())) return
      const approved = await evaluationsApi.approve(evaluationId)
      if (approved.sent_to_lms_at) {
        notify('Evaluación aprobada y enviada al LMS.', 'success')
      } else {
        // La aprobacion se conserva aunque el LMS falle (RI-07); el docente debe saberlo.
        notify('Evaluación aprobada, pero no se pudo enviar al LMS. Quedó registrada como incidencia.', 'error')
      }
      await reload()
    } catch (apiError) {
      notifyError(apiError as ApiError)
    } finally {
      setBusy(null)
    }
  }

  const displayStatus = data.status === 'APPROVED' && !data.sent_to_lms_at ? 'APPROVED_NOT_SENT' : data.status

  return (
    <div className="max-w-6xl">
      <button
        type="button"
        onClick={goBack}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver
      </button>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">Revisión de evaluación</h1>
            <StatusBadge status={displayStatus} />
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {data.submission.student_identifier} · {data.submission.original_filename} · {snapshot.name} (v
            {snapshot.version})
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => (dirty ? setConfirmRegenerate(true) : regenerate())}
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === 'regenerate' ? 'Generando nueva propuesta...' : 'Solicitar nueva evaluación'}
          </button>
        )}
      </header>

      {busy === 'regenerate' && (
        <Loader label="La IA está generando una nueva propuesta. Esto puede tardar hasta un minuto." />
      )}

      {data.status === 'FAILED' && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          La generación falló y no hay propuesta que revisar. Puedes intentar regenerarla.
        </p>
      )}

      {data.status === 'FAILED' ? null : readOnly ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Esta evaluación ya fue aprobada y queda congelada; solo puede consultarse.
        </p>
      ) : (
        <p className="mt-4 text-sm text-gray-600">
          Revisa y modifica antes de aprobar. Los cambios realizados serán los que se envíen a la plataforma
          educativa.
        </p>
      )}

      {/* Sin propuesta valida no hay nada que revisar: solo se ofrece regenerar. */}
      {data.status !== 'FAILED' && (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-[16rem_1fr]">
            <div>
              <EvaluationSummaryCard evaluation={data} />
              {dirty && (
                <p className="mt-2 text-xs text-amber-800">La calificación total se recalcula al guardar los cambios.</p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <label htmlFor="general-feedback" className="text-sm font-semibold text-gray-700">
                Observaciones generales
              </label>
              <textarea
                id="general-feedback"
                value={generalFeedback}
                disabled={readOnly}
                rows={4}
                onChange={(event) => setGeneralFeedback(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500"
              />
            </div>
          </div>

          <h2 className="mt-6 font-semibold text-gray-900">Detalle por criterio</h2>
          <div className="relative mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <caption className="sr-only">Detalle por criterio</caption>
              <thead className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Criterio</th>
                  <th scope="col" className="px-4 py-3">Nivel alcanzado</th>
                  <th scope="col" className="px-4 py-3">Puntos</th>
                  <th scope="col" className="px-4 py-3">Retroalimentación</th>
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
        </>
      )}

      {data.generations.length > 1 || data.revisions.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <h2 className="font-semibold text-gray-900">Generaciónes de IA</h2>
            <ul className="mt-2 space-y-1 text-gray-600">
              {data.generations.map((generation) => (
                <li key={generation.id}>
                  #{generation.generation_number} · {generation.validation_status === 'VALID' ? 'Válida' : 'Descartada'}{' '}
                  · {generation.model_name}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <h2 className="font-semibold text-gray-900">Cambios del docente</h2>
            {data.revisions.length === 0 ? (
              <p className="mt-2 text-gray-600">Aún no hay modificaciones registradas.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-gray-600">
                {data.revisions.map((revision) => (
                  <li key={revision.id}>
                    {REVISION_LABELS[revision.field_changed] ?? revision.field_changed}: de "{revision.previous_value}" a "
                    {revision.new_value}"
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {!readOnly && data.status !== 'FAILED' && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5">
          <button
            type="button"
            onClick={goBack}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <InfoIcon className="h-4 w-4 shrink-0 text-gray-500" />
            {hasInvalidScore
              ? 'Corrige los puntajes fuera de rango para poder guardar o aprobar.'
              : 'La evaluación se enviará a la plataforma educativa solo después de aprobar.'}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy !== null || !dirty || hasInvalidScore}
              onClick={saveReview}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === 'save' ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              disabled={busy !== null || hasInvalidScore}
              onClick={() => setConfirmApprove(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy === 'approve' ? 'Aprobando...' : 'Aprobar y enviar'}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmApprove}
        title="Aprobar evaluación"
        message={`${dirty ? 'Primero se guardarán tus cambios. ' : ''}Al aprobar, la evaluación queda congelada y se envia al LMS configurado. ¿Deseas continuar?`}
        confirmLabel="Aprobar"
        onConfirm={approve}
        onCancel={() => setConfirmApprove(false)}
      />
      <ConfirmDialog
        open={confirmRegenerate}
        title="Solicitar nueva evaluación"
        message="Tienes cambios sin guardar. Una nueva propuesta de la IA los reemplazará. ¿Deseas continuar?"
        confirmLabel="Generar de nuevo"
        danger
        onConfirm={regenerate}
        onCancel={() => setConfirmRegenerate(false)}
      />
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Cambios sin guardar"
        message="Si sales ahora perderás los cambios hechos en esta revisión."
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir revisando"
        danger
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ConfirmDialog } from '../components/ConfirmDialog'
import { FormField } from '../components/FormField'
import { ArrowLeftIcon, PlusIcon } from '../components/icons'
import { Loader } from '../components/Loader'
import { RubricCriterionEditor } from '../components/RubricCriterionEditor'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/ToastNotifications'
import { usePageTitle } from '../hooks/usePageTitle'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import type { ApiError } from '../services/apiClient'
import { rubricsApi } from '../services/rubricsApi'
import type { Rubric, RubricCriterionInput, RubricInput, RubricStatus } from '../types'
import { fieldId, validateRubric } from '../utils/rubricValidation'

const emptyCriterion = (order: number): RubricCriterionInput => ({
  name: '',
  description: null,
  // Vacios (NaN) en lugar de 0: el campo muestra el ejemplo y no hay un 0 que borrar.
  weight: NaN,
  order,
  levels: [{ name: '', description: null, score: NaN, order: 1 }],
})

const emptyRubric: RubricInput = {
  name: '',
  description: null,
  instructions: null,
  criteria: [emptyCriterion(1)],
}

const toInput = (rubric: Rubric): RubricInput => ({
  name: rubric.name,
  description: rubric.description,
  instructions: rubric.instructions,
  criteria: rubric.criteria.map((criterion) => ({
    name: criterion.name,
    description: criterion.description,
    weight: criterion.weight,
    order: criterion.order,
    levels: criterion.levels.map((level) => ({
      name: level.name,
      description: level.description,
      score: level.score,
      order: level.order,
    })),
  })),
})

type Action = 'save' | 'publish'

export function RubricDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { notify, notifyError } = useToast()

  const isNew = id === 'nueva'
  const rubricId = isNew ? null : Number(id)

  const [form, setForm] = useState<RubricInput>(emptyRubric)
  const [savedForm, setSavedForm] = useState<RubricInput>(emptyRubric)
  const [status, setStatus] = useState<RubricStatus>('DRAFT')
  const [version, setVersion] = useState(1)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState<Action | null>(null)
  // Los errores se muestran a partir del primer intento de guardar/publicar y se
  // recalculan mientras el docente corrige, para que desaparezcan al arreglarlos.
  const [attempted, setAttempted] = useState<Action | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  usePageTitle(isNew ? 'Nueva rúbrica' : form.name || 'Rúbrica')

  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm)
  const { blocker, allowNavigation } = useUnsavedChanges(dirty)

  useEffect(() => {
    if (rubricId === null) return
    let active = true
    setLoading(true)
    rubricsApi
      .get(rubricId)
      .then((rubric) => {
        if (!active) return
        const input = toInput(rubric)
        setForm(input)
        setSavedForm(input)
        setStatus(rubric.status)
        setVersion(rubric.version)
      })
      .catch((apiError) => notifyError(apiError as ApiError))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [rubricId, notifyError])

  const totalWeight = form.criteria.reduce((total, criterion) => total + (criterion.weight || 0), 0)
  const readOnly = status === 'ARCHIVED'
  // Editar una rubrica publicada exige las mismas reglas que publicarla (backend: validate_structure).
  const validate = (action: Action) => validateRubric(form, action === 'publish' || status === 'PUBLISHED')
  const errors = attempted ? validate(attempted) : {}
  const errorEntries = Object.entries(errors)

  const updateCriterion = (index: number, criterion: RubricCriterionInput) => {
    setForm({
      ...form,
      criteria: form.criteria.map((item, position) => (position === index ? criterion : item)),
    })
  }

  const removeCriterion = (index: number) => {
    setForm({
      ...form,
      criteria: form.criteria
        .filter((_, position) => position !== index)
        .map((criterion, position) => ({ ...criterion, order: position + 1 })),
    })
  }

  const addCriterion = () => {
    const newIndex = form.criteria.length
    setForm({ ...form, criteria: [...form.criteria, emptyCriterion(newIndex + 1)] })
    // Tras el render, lleva al docente al criterio recien creado.
    window.setTimeout(() => {
      const input = document.getElementById(fieldId.criterionName(newIndex))
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      input?.focus({ preventScroll: true })
    })
  }

  /** Valida antes de llamar al backend; si falta algo, muestra y enfoca la lista de pendientes. */
  const checkBeforeSubmit = (action: Action) => {
    setAttempted(action)
    if (Object.keys(validate(action)).length === 0) return true
    window.setTimeout(() => {
      summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      summaryRef.current?.focus({ preventScroll: true })
    })
    return false
  }

  const cancel = () => navigate('/rubricas')

  const save = async () => {
    if (!checkBeforeSubmit('save')) return
    setSaving('save')
    try {
      const saved = rubricId
        ? await rubricsApi.update(rubricId, form)
        : await rubricsApi.create(form)
      notify('Rúbrica guardada.', 'success')
      setSavedForm(form)
      setStatus(saved.status)
      setVersion(saved.version)
      setAttempted(null)
      if (!rubricId) {
        allowNavigation()
        navigate(`/rubricas/${saved.id}`, { replace: true })
      }
    } catch (apiError) {
      notifyError(apiError as ApiError)
    } finally {
      setSaving(null)
    }
  }

  const publish = async () => {
    if (rubricId === null) return
    if (!checkBeforeSubmit('publish')) return
    setSaving('publish')
    try {
      await rubricsApi.update(rubricId, form)
      setSavedForm(form)
      const published = await rubricsApi.publish(rubricId)
      setStatus(published.status)
      setVersion(published.version)
      setAttempted(null)
      notify('Rúbrica publicada: ya puede usarse para evaluar.', 'success')
    } catch (apiError) {
      notifyError(apiError as ApiError)
    } finally {
      setSaving(null)
    }
  }

  const focusField = (targetId: string) => {
    const element = document.getElementById(targetId)
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    element?.focus({ preventScroll: true })
  }

  if (loading) return <Loader label="Cargando rúbrica..." />

  const publishHint = isNew
    ? 'Guarda la rúbrica antes de publicarla.'
    : status === 'PUBLISHED'
      ? 'Ya está publicada; al guardar cambios se crea una nueva versión.'
      : null

  return (
    <div className="max-w-5xl">
      <button
        type="button"
        onClick={cancel}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver al listado
      </button>

      <header className="mt-3">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isNew ? 'Nueva rúbrica' : savedForm.name || 'Editar rúbrica'}
        </h1>
        {!isNew && (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <StatusBadge status={status} /> versión {version}
            {dirty && <span className="text-amber-800">· Cambios sin guardar</span>}
          </p>
        )}
        <p className="mt-2 text-sm text-gray-600">
          Los campos marcados con <span className="text-red-700">*</span> son obligatorios.
        </p>
      </header>

      {readOnly && (
        <p className="mt-4 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
          Esta rúbrica está archivada y solo puede consultarse.
        </p>
      )}

      {errorEntries.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="error-summary-title"
          className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          <h2 id="error-summary-title" className="font-semibold">
            {attempted === 'publish' ? 'Para publicar la rúbrica' : 'Para guardar la rúbrica'} falta completar{' '}
            {errorEntries.length === 1 ? '1 dato' : `${errorEntries.length} datos`}:
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errorEntries.map(([target, message]) => (
              <li key={target}>
                <button
                  type="button"
                  onClick={() => focusField(target)}
                  className="text-left underline decoration-red-300 underline-offset-2 hover:decoration-red-700"
                >
                  {message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section
        aria-labelledby="info-title"
        className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5"
      >
        <h2 id="info-title" className="font-semibold text-gray-900">
          Información general
        </h2>
        <FormField
          id={fieldId.name}
          label="Nombre de la rúbrica"
          required
          maxLength={255}
          value={form.name}
          disabled={readOnly}
          placeholder="Ej. Ensayo argumentativo"
          error={errors[fieldId.name]}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <FormField
          id="rubric-description"
          label="Descripción (opcional)"
          value={form.description ?? ''}
          disabled={readOnly}
          placeholder="Ej. Rúbrica para ensayos breves de primer semestre"
          onChange={(event) => setForm({ ...form, description: event.target.value || null })}
        />
        <FormField
          id="rubric-instructions"
          label="Instrucciones para la IA (opcional)"
          multiline
          rows={3}
          value={form.instructions ?? ''}
          disabled={readOnly}
          hint="Indicaciones generales que la IA tendrá en cuenta al evaluar con esta rúbrica."
          placeholder="Ej. Evalúa con el nivel esperado de un estudiante de primer semestre."
          onChange={(event) => setForm({ ...form, instructions: event.target.value || null })}
        />
      </section>

      <section aria-labelledby="criteria-title" className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="criteria-title" className="font-semibold text-gray-900">
              Criterios
            </h2>
            <p className="text-sm text-gray-600">
              Aspectos que se evaluarán. Los pesos de todos los criterios deben sumar 100% para publicar.
            </p>
          </div>
        </div>

        <div id={fieldId.criteria} tabIndex={-1} className="mt-3 space-y-4">
          {form.criteria.map((criterion, index) => (
            <RubricCriterionEditor
              key={index}
              index={index}
              criterion={criterion}
              errors={errors}
              disabled={readOnly}
              canRemove={form.criteria.length > 1}
              onChange={(updated) => updateCriterion(index, updated)}
              onRemove={() => removeCriterion(index)}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={readOnly}
            onClick={addCriterion}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <PlusIcon className="h-4 w-4" />
            Agregar criterio
          </button>
          <p
            aria-live="polite"
            className={`text-sm font-medium ${
              errors[fieldId.criteria] ? 'text-red-700' : totalWeight === 100 ? 'text-emerald-700' : 'text-amber-800'
            }`}
          >
            Suma de pesos: {totalWeight}% {totalWeight === 100 ? '✓' : '(debe ser 100% para publicar)'}
          </p>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5">
        <button
          type="button"
          onClick={cancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {publishHint && (
            <p id="publish-hint" className="text-xs text-gray-600">
              {publishHint}
            </p>
          )}
          <button
            type="button"
            disabled={saving !== null || readOnly || isNew || status === 'PUBLISHED'}
            aria-describedby={publishHint ? 'publish-hint' : undefined}
            onClick={publish}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {saving === 'publish' ? 'Publicando...' : 'Publicar'}
          </button>
          <button
            type="button"
            disabled={saving !== null || readOnly || (!dirty && !isNew)}
            onClick={save}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving === 'save' ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Cambios sin guardar"
        message="Si sales ahora perderás los cambios hechos en esta rúbrica."
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir editando"
        danger
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  )
}

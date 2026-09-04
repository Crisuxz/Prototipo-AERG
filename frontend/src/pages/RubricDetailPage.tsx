import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Loader } from '../components/Loader'
import { RubricCriterionEditor } from '../components/RubricCriterionEditor'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/ToastNotifications'
import type { ApiError } from '../services/apiClient'
import { rubricsApi } from '../services/rubricsApi'
import type { Rubric, RubricCriterionInput, RubricInput, RubricStatus } from '../types'

const emptyCriterion = (order: number): RubricCriterionInput => ({
  name: '',
  description: null,
  weight: 0,
  order,
  levels: [{ name: '', description: null, score: 0, order: 1 }],
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

export function RubricDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { notify, notifyError } = useToast()

  const isNew = id === 'nueva'
  const rubricId = isNew ? null : Number(id)

  const [form, setForm] = useState<RubricInput>(emptyRubric)
  const [status, setStatus] = useState<RubricStatus>('DRAFT')
  const [version, setVersion] = useState(1)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (rubricId === null) return
    let active = true
    setLoading(true)
    rubricsApi
      .get(rubricId)
      .then((rubric) => {
        if (!active) return
        setForm(toInput(rubric))
        setStatus(rubric.status)
        setVersion(rubric.version)
      })
      .catch((apiError) => notifyError(apiError as ApiError))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [rubricId, notifyError])

  const totalWeight = form.criteria.reduce((total, criterion) => total + criterion.weight, 0)
  const readOnly = status === 'ARCHIVED'

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

  const save = async () => {
    setSaving(true)
    try {
      const saved = rubricId
        ? await rubricsApi.update(rubricId, form)
        : await rubricsApi.create(form)
      notify('Rubrica guardada.', 'success')
      setStatus(saved.status)
      setVersion(saved.version)
      if (!rubricId) navigate(`/rubricas/${saved.id}`, { replace: true })
    } catch (apiError) {
      notifyError(apiError as ApiError)
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    if (rubricId === null) return
    setSaving(true)
    try {
      await rubricsApi.update(rubricId, form)
      const published = await rubricsApi.publish(rubricId)
      setStatus(published.status)
      setVersion(published.version)
      notify('Rubrica publicada: ya puede usarse para evaluar.', 'success')
    } catch (apiError) {
      notifyError(apiError as ApiError)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loader label="Cargando rubrica..." />

  return (
    <div className="max-w-4xl">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">{isNew ? 'Nueva rubrica' : form.name}</h2>
          {!isNew && (
            <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <StatusBadge status={status} /> version {version}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving || readOnly}
            onClick={save}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            type="button"
            disabled={saving || readOnly || isNew || status === 'PUBLISHED'}
            onClick={publish}
            className="rounded bg-purple-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Publicar
          </button>
        </div>
      </header>

      <div className="mt-4 space-y-3 rounded border border-gray-200 bg-white p-4">
        <label className="block text-sm">
          <span className="text-gray-600">Nombre</span>
          <input
            value={form.name}
            disabled={readOnly}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Descripcion</span>
          <input
            value={form.description ?? ''}
            disabled={readOnly}
            onChange={(event) => setForm({ ...form, description: event.target.value || null })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Instrucciones para la IA (opcional)</span>
          <textarea
            value={form.instructions ?? ''}
            disabled={readOnly}
            rows={3}
            onChange={(event) => setForm({ ...form, instructions: event.target.value || null })}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h3 className="font-semibold">Criterios</h3>
        <p className={totalWeight === 100 ? 'text-sm text-green-700' : 'text-sm text-amber-700'}>
          Suma de pesos: {totalWeight}% {totalWeight === 100 ? '' : '(debe ser 100 para publicar)'}
        </p>
      </div>

      <div className="mt-3 space-y-3">
        {form.criteria.map((criterion, index) => (
          <RubricCriterionEditor
            key={index}
            criterion={criterion}
            disabled={readOnly}
            onChange={(updated) => updateCriterion(index, updated)}
            onRemove={() => removeCriterion(index)}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={readOnly}
        onClick={() =>
          setForm({ ...form, criteria: [...form.criteria, emptyCriterion(form.criteria.length + 1)] })
        }
        className="mt-3 text-sm font-medium text-purple-700 disabled:opacity-40"
      >
        + Agregar criterio
      </button>
    </div>
  )
}

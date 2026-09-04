import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ArrowLeftIcon, PlusIcon } from '../components/icons'
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
  const [tab, setTab] = useState<'criterios' | 'info'>('criterios')

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

  const cancel = () => navigate('/rubricas')

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
    <div className="max-w-5xl">
      <button
        type="button"
        onClick={cancel}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver al listado
      </button>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <input
            value={form.name}
            disabled={readOnly}
            placeholder={isNew ? 'Nueva rubrica' : 'Nombre de la rubrica'}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="rounded-lg border border-transparent px-1 -mx-1 text-2xl font-semibold text-gray-900 hover:border-gray-200 focus:border-indigo-400 focus:outline-none"
          />
          {!isNew && (
            <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <StatusBadge status={status} /> version {version}
            </p>
          )}
          <input
            value={form.description ?? ''}
            disabled={readOnly}
            placeholder="Descripcion breve de la rubrica"
            onChange={(event) => setForm({ ...form, description: event.target.value || null })}
            className="mt-1 w-full max-w-lg rounded-lg border border-transparent px-1 -mx-1 text-sm text-gray-500 hover:border-gray-200 focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <button
          type="button"
          disabled={readOnly}
          onClick={() =>
            setForm({ ...form, criteria: [...form.criteria, emptyCriterion(form.criteria.length + 1)] })
          }
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          <PlusIcon className="h-4 w-4" />
          Agregar criterio
        </button>
      </header>

      <div className="mt-6 flex gap-6 border-b border-gray-200 text-sm font-medium">
        <button
          type="button"
          onClick={() => setTab('criterios')}
          className={`border-b-2 pb-2.5 ${
            tab === 'criterios' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'
          }`}
        >
          Criterios
        </button>
        <button
          type="button"
          onClick={() => setTab('info')}
          className={`border-b-2 pb-2.5 ${
            tab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'
          }`}
        >
          Informacion general
        </button>
      </div>

      {tab === 'criterios' ? (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3">Criterio</th>
                  <th className="px-4 py-3">Niveles de desempenio</th>
                  <th className="px-4 py-3">Peso (%)</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {form.criteria.map((criterion, index) => (
                  <RubricCriterionEditor
                    key={index}
                    criterion={criterion}
                    disabled={readOnly}
                    onChange={(updated) => updateCriterion(index, updated)}
                    onRemove={() => removeCriterion(index)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <p className={`mt-2 text-sm ${totalWeight === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
            Suma de pesos: {totalWeight}% {totalWeight === 100 ? '' : '(debe ser 100 para publicar)'}
          </p>
        </>
      ) : (
        <div className="mt-4 space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Nombre</span>
            <input
              value={form.name}
              disabled={readOnly}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Descripcion</span>
            <input
              value={form.description ?? ''}
              disabled={readOnly}
              onChange={(event) => setForm({ ...form, description: event.target.value || null })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Instrucciones para la IA (opcional)</span>
            <textarea
              value={form.instructions ?? ''}
              disabled={readOnly}
              rows={4}
              onChange={(event) => setForm({ ...form, instructions: event.target.value || null })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </label>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={cancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving || readOnly || isNew || status === 'PUBLISHED'}
            onClick={publish}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Publicar
          </button>
          <button
            type="button"
            disabled={saving || readOnly}
            onClick={save}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}

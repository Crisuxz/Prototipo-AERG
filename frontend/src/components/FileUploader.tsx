import { useId, useRef, useState } from 'react'

import { FileTextIcon, XIcon } from './icons'

const ALLOWED_EXTENSIONS = ['txt', 'pdf', 'docx']
const MAX_MB = 10

interface FileUploaderProps {
  file: File | null
  onSelect: (file: File | null) => void
  disabled?: boolean
}

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

/** Validacion ligera de UX; la validacion autoritativa la hace el backend (Parte 53). */
export function FileUploader({ file, onSelect, disabled }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const hintId = useId()
  const warningId = useId()

  const handleFile = (selected: File | null) => {
    setWarning(null)
    if (!selected) {
      onSelect(null)
      return
    }
    const extension = selected.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setWarning(`"${selected.name}" no es un formato admitido. Solo se aceptan archivos TXT, PDF o DOCX.`)
      onSelect(null)
      return
    }
    if (selected.size > MAX_MB * 1024 * 1024) {
      setWarning(`"${selected.name}" pesa ${formatSize(selected.size)} y supera los ${MAX_MB} MB permitidos.`)
      onSelect(null)
      return
    }
    onSelect(selected)
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!disabled) handleFile(event.dataTransfer.files[0] ?? null)
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? 'border-indigo-500 bg-indigo-50' : warning ? 'border-red-300 bg-red-50/40' : 'border-gray-300 bg-gray-50'
        }`}
      >
        {file ? (
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-800">
            <FileTextIcon className="h-5 w-5 text-indigo-600" />
            <span className="font-medium">{file.name}</span>
            <span className="text-gray-600">({formatSize(file.size)})</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleFile(null)}
              aria-label={`Quitar ${file.name}`}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-40"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-700">Arrastra el trabajo aquí o selecciona un archivo</p>
        )}
        <p id={hintId} className="mt-1 text-xs text-gray-600">
          TXT, PDF o DOCX, hasta {MAX_MB} MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf,.docx"
          className="hidden"
          tabIndex={-1}
          onChange={(event) => {
            handleFile(event.target.files?.[0] ?? null)
            // Permite volver a elegir el mismo archivo despues de quitarlo.
            event.target.value = ''
          }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          aria-describedby={warning ? `${hintId} ${warningId}` : hintId}
          className="mt-3 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {file ? 'Cambiar archivo' : 'Seleccionar archivo'}
        </button>
      </div>
      {warning && (
        <p id={warningId} role="alert" className="mt-2 text-sm text-red-700">
          {warning}
        </p>
      )}
    </div>
  )
}

import { useRef, useState } from 'react'

const ALLOWED_EXTENSIONS = ['txt', 'pdf', 'docx']
const MAX_MB = 10

interface FileUploaderProps {
  file: File | null
  onSelect: (file: File | null) => void
  disabled?: boolean
}

/** Validacion ligera de UX; la validacion autoritativa la hace el backend (Parte 53). */
export function FileUploader({ file, onSelect, disabled }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const handleFile = (selected: File | null) => {
    setWarning(null)
    if (!selected) {
      onSelect(null)
      return
    }
    const extension = selected.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setWarning('Solo se admiten archivos TXT, PDF o DOCX.')
      onSelect(null)
      return
    }
    if (selected.size > MAX_MB * 1024 * 1024) {
      setWarning(`El archivo supera los ${MAX_MB} MB permitidos.`)
      onSelect(null)
      return
    }
    onSelect(selected)
  }

  return (
    <div>
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          if (!disabled) handleFile(event.dataTransfer.files[0] ?? null)
        }}
        className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center"
      >
        <p className="text-sm text-gray-600">
          {file ? file.name : 'Arrastra el trabajo aqui o selecciona un archivo'}
        </p>
        <p className="mt-1 text-xs text-gray-400">TXT, PDF o DOCX, hasta {MAX_MB} MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf,.docx"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Seleccionar archivo
        </button>
      </div>
      {warning && <p className="mt-2 text-sm text-red-600">{warning}</p>}
    </div>
  )
}

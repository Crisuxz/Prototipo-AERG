import { useEffect, useId, useRef, type ReactNode } from 'react'

import { XIcon } from './icons'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/**
 * Usa <dialog> nativo con showModal(): el navegador atrapa el foco, cierra con Escape,
 * vuelve inerte el resto de la pagina y devuelve el foco al elemento que lo abrio.
 */
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-0 shadow-xl backdrop:bg-black/40"
    >
      {open && (
        <>
          <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h2 id={titleId} className="font-semibold text-gray-900">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </header>
          <div className="px-5 py-4 text-sm text-gray-700">{children}</div>
          {footer && (
            <footer className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">{footer}</footer>
          )}
        </>
      )}
    </dialog>
  )
}

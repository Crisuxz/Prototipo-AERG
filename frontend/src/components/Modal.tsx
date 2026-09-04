import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded bg-white shadow-lg">
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">
            X
          </button>
        </header>
        <div className="px-5 py-4 text-sm text-gray-700">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">{footer}</footer>}
      </div>
    </div>
  )
}

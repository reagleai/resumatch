import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  // Element focused before the dialog opened, so we can restore it on close.
  const previouslyFocused = useRef<HTMLElement | null>(null)
  // Keep the latest onClose without re-running the focus effect when the
  // parent passes a new inline handler identity on every render.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Native modal dialogs make the background inert and contain keyboard
  // focus, including inside embedded resume documents.
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    dialog.showModal()
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      dialog.close()
      previouslyFocused.current?.focus?.({ preventScroll: true })
    }
  }, [open])

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      className="modal-backdrop"
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onCloseRef.current() }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="modal-panel"
      >
        <div className="modal-header">
          <h2
            id={titleId}
            className="modal-title"
          >
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="modal-close"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </dialog>
  )
}

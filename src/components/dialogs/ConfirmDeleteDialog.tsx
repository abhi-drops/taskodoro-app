import { useEffect } from 'react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
}

export function ConfirmDeleteDialog({ open, onOpenChange, onConfirm, title, description, confirmLabel = 'Delete' }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 m3-fade-in"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        className="m3-dialog fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm rounded-3xl border border-white/10 shadow-2xl p-6"
        style={{ background: 'oklch(0.12 0.01 30)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 id="confirm-delete-title" className="font-black text-lg text-white mb-2">{title}</h2>
        {description && (
          <p className="text-sm text-white/50 mb-5">{description}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="btn-spring flex-1 h-11 bg-white/8 border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/15 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(); onOpenChange(false) }}
            className="btn-spring flex-1 h-11 bg-red-500/15 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/25 hover:text-red-300"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}

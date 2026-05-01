import { ReactNode, useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  width?: string
}

export default function Modal({ open, onClose, children, title, width = 'min(90vw, 560px)' }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl flex flex-col max-h-[90vh] overflow-hidden"
        style={{ width }}
        onClick={e => e.stopPropagation()}>
        {title && (
          <div className="lbl px-4 py-3 border-b border-border">{title}</div>
        )}
        <div className="overflow-auto p-4">{children}</div>
      </div>
    </div>
  )
}

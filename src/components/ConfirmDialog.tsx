import Modal from './Modal'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  tone?: 'default' | 'danger'
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'CONFIRM', cancelLabel = 'CANCEL',
  onConfirm, onCancel, tone = 'default',
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title} width="min(90vw, 380px)">
      <div className="text-xs text-ink mb-4">{message}</div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1 text-xs text-muted border border-border">
          {cancelLabel}
        </button>
        <button onClick={onConfirm}
          className={`px-3 py-1 text-xs border ${tone === 'danger' ? 'text-bad border-bad' : 'text-warn border-warn'}`}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

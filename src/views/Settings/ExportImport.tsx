import { useRef, useState } from 'react'
import { useStore } from '../../store'
import ConfirmDialog from '../../components/ConfirmDialog'

export default function ExportImport() {
  const exportState = useStore(s => s.exportState)
  const importState = useStore(s => s.importState)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingRaw, setPendingRaw] = useState<unknown>(null)

  const doExport = () => {
    const data = { version: 1, exportedAt: new Date().toISOString(), ...exportState() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = 'danger-close-save.json'
      document.body.appendChild(a); a.click(); a.remove()
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const text = await f.text()
      const raw = JSON.parse(text)
      setPendingRaw(raw)
    } catch (err) {
      setError('Could not parse JSON file.')
    } finally {
      e.target.value = ''
    }
  }

  const confirmImport = () => {
    try {
      setError(null)
      importState(pendingRaw)
      setPendingRaw(null)
    } catch (err: any) {
      setError(err?.message ?? 'Invalid save file.')
      setPendingRaw(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button onClick={doExport} className="text-[11px] text-ok border border-ok px-3 py-1">EXPORT JSON</button>
        <button onClick={() => fileRef.current?.click()} className="text-[11px] text-warn border border-warn px-3 py-1">IMPORT JSON</button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onFile} />
      </div>
      {error && <div className="text-[10px] text-bad">{error}</div>}

      <ConfirmDialog
        open={pendingRaw !== null}
        title="OVERWRITE STATE"
        message="Importing will overwrite all current troopers, mission, and dice history. Continue?"
        confirmLabel="OVERWRITE"
        tone="danger"
        onConfirm={confirmImport}
        onCancel={() => setPendingRaw(null)}
      />
    </div>
  )
}

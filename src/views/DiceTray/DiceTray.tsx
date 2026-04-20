import { useStore } from '../../store'
export default function DiceTray() {
  const setDiceTrayOpen = useStore(s => s.setDiceTrayOpen)
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setDiceTrayOpen(false)}>
      <div className="bg-surface border border-border p-4 w-[min(90vw,480px)]" onClick={e => e.stopPropagation()}>
        <div className="lbl mb-2">DICE TRAY</div>
      </div>
    </div>
  )
}

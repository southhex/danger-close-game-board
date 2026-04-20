import { useState } from 'react'
import { useStore } from '../../store'

export default function MissionNotes() {
  const mission = useStore(s => s.mission)
  const setMission = useStore(s => s.setMission)
  const [open, setOpen] = useState(false)
  if (!mission) return null
  return (
    <div className="bg-surface border border-border">
      <button onClick={() => setOpen(o => !o)} className="w-full flex justify-between items-center px-3 py-2">
        <span className="lbl">MISSION NOTES</span>
        <span className="text-[10px] text-muted">{open ? '▴ COLLAPSE' : '▾ EXPAND'}</span>
      </button>
      {open && (
        <div className="p-3 border-t border-border">
          <textarea rows={4} className="w-full bg-bg border border-border text-ink text-xs p-2 font-mono"
            value={mission.notes} onChange={e => setMission({ notes: e.target.value })} />
        </div>
      )}
    </div>
  )
}

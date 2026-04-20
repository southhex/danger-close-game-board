import { useState } from 'react'
import { useStore } from '../../store'
import TrooperCard from './TrooperCard'
import TrooperEditor from './TrooperEditor'
import { ConfirmDialog } from '../../components'

export default function Barracks() {
  const troopers = useStore(s => s.troopers)
  const prepareMission = useStore(s => s.prepareMission)
  const setView = useStore(s => s.setView)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorId, setEditorId] = useState<string | null>(null)
  const [confirmPrep, setConfirmPrep] = useState(false)

  const openNew = () => { setEditorId(null); setEditorOpen(true) }
  const openEdit = (id: string) => { setEditorId(id); setEditorOpen(true) }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="lbl">BARRACKS</div>
        <div className="flex gap-2">
          <button onClick={openNew} className="text-[11px] text-ok border border-ok px-3 py-1">+ TROOPER</button>
          <button onClick={() => setConfirmPrep(true)}
            disabled={troopers.filter(t => t.active).length === 0}
            className="text-[11px] text-warn border border-warn px-3 py-1 disabled:opacity-40">
            PREPARE FOR MISSION
          </button>
        </div>
      </div>

      {troopers.length === 0 ? (
        <div className="text-[11px] text-muted italic">No troopers yet. Add one to get started.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {troopers.map(t => <TrooperCard key={t.id} trooper={t} onClick={() => openEdit(t.id)} />)}
        </div>
      )}

      <TrooperEditor open={editorOpen} trooperId={editorId} onClose={() => setEditorOpen(false)} />

      <ConfirmDialog
        open={confirmPrep}
        title="PREPARE FOR MISSION"
        message="Reset all active troopers' mission-state fields (grit, ammo, status, positions, uses)?"
        confirmLabel="PREPARE"
        onConfirm={() => { prepareMission(); setConfirmPrep(false); setView('mission') }}
        onCancel={() => setConfirmPrep(false)}
      />
    </div>
  )
}

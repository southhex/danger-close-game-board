import { useState } from 'react'
import { useStore } from '../../store'
import { ConfirmDialog } from '../../components'
import ExportImport from './ExportImport'

export default function Settings() {
  const resetMission = useStore(s => s.resetMission)
  const mission = useStore(s => s.mission)
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div className="p-4 flex flex-col gap-4">
      <section className="bg-surface border border-border p-3 flex flex-col gap-2">
        <div className="lbl text-[10px]">DATA</div>
        <ExportImport />
        <div className="text-[10px] text-muted italic">Saves persist automatically to your browser. Export to back up or move between devices.</div>
      </section>
      {mission && (
        <section className="bg-surface border border-border p-3 flex flex-col gap-2">
          <div className="lbl text-[10px]">MISSION</div>
          <div>
            <button
              onClick={() => setConfirmReset(true)}
              className="text-[11px] text-bad border border-bad px-3 py-1"
            >
              RESET MISSION
            </button>
            <div className="text-[10px] text-muted italic mt-1">Clears all mission state and resets trooper positions.</div>
          </div>
        </section>
      )}
      <ConfirmDialog
        open={confirmReset}
        title="RESET MISSION"
        message="Reset all mission state? Trooper positions, momentum, and advance rolls will be cleared."
        confirmLabel="RESET"
        tone="danger"
        onConfirm={() => { resetMission(); setConfirmReset(false) }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}

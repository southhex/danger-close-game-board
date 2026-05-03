import { useState } from 'react'
import { useStore } from '../../store'
import { Modal, ConfirmDialog } from '../../components'
import type { Mission } from '../../types'

interface Props {
  mission: Mission
}

const DIFFICULTY_LABEL: Record<string, string> = {
  routine: 'Routine', hazardous: 'Hazardous', desperate: 'Desperate',
}

const OBJECTIVE_LABEL: Record<string, string> = {
  seize_secure: 'Seize & Secure', hit_run: 'Hit & Run', defensive: 'Defensive',
}

export default function MissionSummaryCard({ mission }: Props) {
  const openBuilder  = useStore(s => s.openMissionBuilder)
  const deleteMission = useStore(s => s.deleteMission)

  const [modalOpen, setModalOpen]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  const sectorCount = mission.sectors?.length ?? 0

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteMission(mission.id)
    } finally {
      setDeleting(false)
      setModalOpen(false)
      setConfirmDelete(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full text-left bg-bg border border-border rounded-md p-3 hover:border-accent transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-[12px] text-ink truncate font-mono">{mission.name || 'Untitled'}</div>
          <div className="text-[9px] font-bold tracking-wide bg-surface border border-border text-muted rounded-pill px-1.5 py-0.5 shrink-0">
            {DIFFICULTY_LABEL[mission.difficulty ?? ''] ?? '—'}
          </div>
        </div>
        <div className="text-[10px] text-muted font-mono uppercase mt-0.5">
          {OBJECTIVE_LABEL[mission.objectiveCategory ?? ''] ?? '—'} · {sectorCount} sector{sectorCount !== 1 ? 's' : ''}
        </div>
      </button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={mission.name || 'Untitled Mission'}>
        <div className="flex flex-col gap-4">
          {mission.description && (
            <p className="text-[12px] text-muted font-mono">{mission.description}</p>
          )}

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <div className="lbl text-[10px] mb-0.5">Difficulty</div>
              <div className="text-ink">{DIFFICULTY_LABEL[mission.difficulty ?? ''] ?? '—'}</div>
            </div>
            <div>
              <div className="lbl text-[10px] mb-0.5">Objective</div>
              <div className="text-ink">{OBJECTIVE_LABEL[mission.objectiveCategory ?? ''] ?? '—'}</div>
            </div>
            <div>
              <div className="lbl text-[10px] mb-0.5">Sectors</div>
              <div className="text-ink">{sectorCount}</div>
            </div>
            <div>
              <div className="lbl text-[10px] mb-0.5">Airspace</div>
              <div className="text-ink capitalize">{mission.airspace ?? '—'}</div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => { setModalOpen(false); openBuilder(mission.id) }}
              className="flex-1 px-3 py-1.5 text-[11px] border border-border text-muted hover:text-ink font-mono"
            >EDIT</button>
            <button
              type="button"
              disabled
              title="Deploy flow lands in Stage 6."
              className="flex-1 px-3 py-1.5 text-[11px] border border-warn text-warn font-mono opacity-40 cursor-not-allowed"
            >DEPLOY</button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-1.5 text-[11px] border border-bad text-bad font-mono"
            >DELETE</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Mission"
        message={`Delete "${mission.name || 'Untitled'}"? This cannot be undone.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        tone="danger"
      />
    </>
  )
}

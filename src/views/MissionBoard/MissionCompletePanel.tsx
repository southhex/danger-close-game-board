import { useState } from 'react'
import { ConfirmDialog, StatusBadge } from '../../components'
import { useStore } from '../../store'
import { isDeployed } from '../../utils/gameRules'

export default function MissionCompletePanel() {
  const mission = useStore(s => s.mission)
  const allTroopers = useStore(s => s.troopers)
  const resetMission = useStore(s => s.resetMission)

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  if (!mission) return null

  const cleared = mission.sectors.filter(s => s.status === 'cleared')
  const total = mission.sectors.length
  const survivors = allTroopers.filter(t => isDeployed(t, mission) && t.status !== 'dead')
  const lost = allTroopers.filter(t => isDeployed(t, mission) && t.status === 'dead')

  const momentumLabel = (m: number): string => {
    if (m === 3) return 'VICTORY'
    if (m === 2) return 'BREAKING THROUGH'
    if (m === 1) return 'GAINING GROUND'
    if (m === 0) return 'CONTESTED'
    if (m === -1) return 'LOSING GROUND'
    if (m === -2) return 'FALTERING'
    return 'DEFEAT'
  }

  return (
    <div className="bg-surface border border-ok p-3 flex flex-col gap-3 text-[11px] font-mono">
      <div className="text-ok tracking-wider text-[14px]">MISSION COMPLETE</div>

      <div>
        <div className="lbl text-[10px] mb-1">SECTORS</div>
        <div className="flex flex-col gap-1">
          {mission.sectors.map(s => (
            <div key={s.id} className="flex items-center gap-2 border border-border px-2 py-1">
              <span className={`text-[9px] ${s.status === 'cleared' ? 'text-ok' : 'text-muted'}`}>●</span>
              <span className={s.status === 'cleared' ? 'text-ink' : 'text-muted'}>{s.name}</span>
              <span className="text-muted text-[9px] ml-auto">
                C{s.cover}/S{s.space}/TL{s.tl}
              </span>
              <span className={`text-[9px] uppercase ${s.status === 'cleared' ? 'text-ok' : 'text-muted'}`}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-muted mt-1">
          {cleared.length} of {total} sectors cleared.
        </div>
      </div>

      <div>
        <div className="lbl text-[10px] mb-1">FINAL MOMENTUM</div>
        <div className="text-ink">{momentumLabel(mission.momentum)} ({mission.momentum >= 0 ? `+${mission.momentum}` : mission.momentum})</div>
      </div>

      <div>
        <div className="lbl text-[10px] mb-1">SURVIVORS ({survivors.length})</div>
        <div className="flex flex-col gap-1">
          {survivors.map(t => (
            <div key={t.id} className="flex items-center gap-2 border border-border px-2 py-1">
              <span className="text-ink flex-1">{t.name}</span>
              <StatusBadge status={t.status} />
              <span className="text-muted">GRIT {t.grit}/{t.grit_max}</span>
              <span className="text-muted">AMMO {t.ammo}/{t.ammo_max}</span>
            </div>
          ))}
          {survivors.length === 0 && (
            <div className="text-muted">No survivors.</div>
          )}
        </div>
      </div>

      {lost.length > 0 && (
        <div>
          <div className="lbl text-[10px] mb-1 text-bad">LOST ({lost.length})</div>
          <div className="flex flex-col gap-1">
            {lost.map(t => (
              <div key={t.id} className="border border-bad/40 px-2 py-1 text-bad">
                {t.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-1">
        <button
          onClick={() => setResetConfirmOpen(true)}
          className="w-full px-3 py-2 border border-warn text-warn text-[10px] text-left"
        >
          NEW MISSION ▸
        </button>
        <div className="text-[9px] text-muted mt-1">
          Survivors carry forward; sectors and engagement state reset.
        </div>
      </div>

      <ConfirmDialog
        open={resetConfirmOpen}
        title="NEW MISSION"
        message="Reset sectors and start a new mission? Trooper grit/ammo/status will be restored to full."
        confirmLabel="NEW MISSION"
        tone="default"
        onConfirm={() => { setResetConfirmOpen(false); resetMission() }}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  )
}

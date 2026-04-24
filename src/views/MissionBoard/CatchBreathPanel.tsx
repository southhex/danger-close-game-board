import { useState, useEffect } from 'react'
import { ConfirmDialog, StatusBadge } from '../../components'
import { useStore } from '../../store'
import SectorEditorModal from './SectorEditorModal'

export default function CatchBreathPanel() {
  const mission = useStore(s => s.mission)
  const allTroopers = useStore(s => s.troopers)
  const updateTrooper = useStore(s => s.updateTrooper)
  const advanceToNextSector = useStore(s => s.advanceToNextSector)
  const updateEngagement = useStore(s => s.updateEngagement)

  // Derive in component body, not in selectors
  const activeTroopers = allTroopers.filter(t => t.active && t.status !== 'dead')
  const currentIdx = mission ? mission.sectors.findIndex(s => s.id === mission.activeSectorId) : -1
  const nextSector = mission
    ? mission.sectors.slice(currentIdx + 1).find(s => s.status === 'pending') ?? null
    : null

  const [grazedCleared, setGrazedCleared] = useState(false)
  const [hadGrazed, setHadGrazed] = useState(false)

  useEffect(() => {
    const grazed = activeTroopers.filter(t => t.status === 'grazed')
    if (grazed.length > 0) {
      setHadGrazed(true)
      grazed.forEach(t => updateTrooper(t.id, { status: 'ok' }))
    }
    setGrazedCleared(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty: run once on mount

  // Medic and supply gear flags
  const hasMedic = activeTroopers.some(t => t.special_gear === 'Medic Gear')
  const hasSupply = activeTroopers.some(t => t.special_gear === 'Supply Backpack')

  const bleedingOut = activeTroopers.filter(t => t.status === 'bleedingout')
  const wounded = activeTroopers.filter(t => t.status === 'wounded')

  // Medic heal picker
  const [healTargetId, setHealTargetId] = useState('')
  useEffect(() => {
    if (wounded.length > 0 && !wounded.find(t => t.id === healTargetId)) {
      setHealTargetId(wounded[0].id)
    }
  }, [wounded, healTargetId])

  // Confirm "LOST" dialog
  const [lostConfirmId, setLostConfirmId] = useState<string | null>(null)

  // Add sector modal
  const [addSectorOpen, setAddSectorOpen] = useState(false)

  // Radio strike note
  const [radioNote, setRadioNote] = useState<string | null>(null)

  if (!mission) return null

  const radioCountdown = mission.engagement?.radioStrikeCountdown

  function handleRadio(action: 'fire' | 'cancel' | 'move') {
    updateEngagement({ radioStrikeCountdown: null })
    if (action === 'fire') {
      setRadioNote('ARTILLERY FIRE: +2 Momentum, all ground HTs destroyed, Mobility Check or 1d3 injury — apply manually.')
    } else if (action === 'cancel') {
      setRadioNote('Artillery strike cancelled.')
    } else {
      setRadioNote('Moved clear — no friendly injury.')
    }
  }

  return (
    <div className="flex flex-col gap-4 p-3 text-[11px] font-mono">

      {/* ── Header ── */}
      <div>
        <div className="lbl text-[10px] mb-1">CATCH BREATH</div>
        {grazedCleared && hadGrazed && (
          <div className="text-warn border border-warn/40 px-2 py-1 text-[10px]">
            GRAZED TROOPERS AUTO-RECOVERED TO OK
          </div>
        )}
      </div>

      {/* ── Section 2: Trooper status grid ── */}
      <div>
        <div className="lbl text-[10px] mb-1">TROOPER STATUS</div>
        <div className="flex flex-col gap-1">
          {activeTroopers.map(t => (
            <div key={t.id} className="flex items-center gap-3 border border-border px-2 py-1">
              <span className="text-ink flex-1">{t.name}</span>
              <StatusBadge status={t.status} />
              <span className="text-muted">GRIT {t.grit}/{t.grit_max}</span>
              <span className="text-muted">AMMO {t.ammo}/{t.ammo_max}</span>
            </div>
          ))}
          {activeTroopers.length === 0 && (
            <div className="text-muted">No active troopers.</div>
          )}
        </div>
      </div>

      {/* ── Section 3: Bleeding Out ── */}
      {bleedingOut.length > 0 && (
        <div>
          <div className="lbl text-[10px] mb-1">BLEEDING OUT</div>
          <div className="flex flex-col gap-1">
            {bleedingOut.map(t => (
              <div key={t.id} className="flex items-center gap-2 border border-bad/50 px-2 py-1">
                <span className="text-bad flex-1">{t.name} — BLEEDING OUT</span>
                {hasMedic && (
                  <button
                    onClick={() => updateTrooper(t.id, { status: 'wounded' })}
                    className="px-2 py-0.5 border border-ok text-ok text-[10px]"
                  >
                    STABILISE
                  </button>
                )}
                <button
                  onClick={() => setLostConfirmId(t.id)}
                  className="px-2 py-0.5 border border-bad text-bad text-[10px]"
                >
                  LOST
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 4: Medic Gear ── */}
      {hasMedic && wounded.length > 0 && (
        <div>
          <div className="lbl text-[10px] mb-1">MEDIC GEAR — HEAL WOUNDED</div>
          <div className="flex items-center gap-2">
            <select
              value={healTargetId}
              onChange={e => setHealTargetId(e.target.value)}
              className="bg-bg border border-border text-ink font-mono text-[11px] px-2 py-1 flex-1"
            >
              {wounded.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button
              disabled={!healTargetId}
              onClick={() => { if (healTargetId) updateTrooper(healTargetId, { status: 'ok' }) }}
              className="px-3 py-1 border border-ok text-ok text-[10px] disabled:opacity-40"
            >
              HEAL
            </button>
          </div>
        </div>
      )}

      {/* ── Section 5: Supply Backpack ── */}
      {hasSupply && (
        <div>
          <div className="lbl text-[10px] mb-1">SUPPLY BACKPACK — AMMO</div>
          <div className="flex flex-col gap-1">
            {activeTroopers.map(t => (
              <div key={t.id} className="flex items-center gap-2 border border-border px-2 py-1">
                <span className="text-ink flex-1">{t.name}</span>
                <span className="text-muted">AMMO</span>
                <button
                  onClick={() => updateTrooper(t.id, { ammo: Math.max(0, t.ammo - 1) })}
                  disabled={t.ammo <= 0}
                  className="px-2 py-0.5 border border-border text-ink disabled:opacity-30 text-[10px]"
                >
                  −
                </button>
                <span className="text-ink w-6 text-center">{t.ammo}/{t.ammo_max}</span>
                <button
                  onClick={() => updateTrooper(t.id, { ammo: Math.min(t.ammo_max, t.ammo + 1) })}
                  disabled={t.ammo >= t.ammo_max}
                  className="px-2 py-0.5 border border-border text-ink disabled:opacity-30 text-[10px]"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 6: Pending Radio Strike ── */}
      {radioCountdown != null && (
        <div>
          <div className="lbl text-[10px] mb-1">ARTILLERY STRIKE PENDING</div>
          <div className="text-warn border border-warn/40 px-2 py-1 mb-2">
            {radioCountdown} EXCHANGES REMAINING
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleRadio('fire')}
              className="px-3 py-1 border border-bad text-bad text-[10px]"
            >
              FIRE NOW
            </button>
            <button
              onClick={() => handleRadio('cancel')}
              className="px-3 py-1 border border-border text-muted text-[10px]"
            >
              CANCEL
            </button>
            <button
              onClick={() => handleRadio('move')}
              className="px-3 py-1 border border-ok text-ok text-[10px]"
            >
              MOVE CLEAR (NO FRIENDLY INJURY)
            </button>
          </div>
          {radioNote && (
            <div className="text-muted mt-1 border border-border px-2 py-1 text-[10px]">{radioNote}</div>
          )}
        </div>
      )}
      {radioCountdown == null && radioNote && (
        <div className="text-muted border border-border px-2 py-1 text-[10px]">{radioNote}</div>
      )}

      {/* ── Section 7: Advance ── */}
      <div>
        <div className="lbl text-[10px] mb-1">ADVANCE</div>
        {nextSector ? (
          <button
            onClick={advanceToNextSector}
            className="w-full px-3 py-2 border border-ok text-ok text-[10px] text-left"
          >
            ADVANCE TO NEXT SECTOR ({nextSector.name}) →
          </button>
        ) : (
          <>
            <button
              onClick={() => setAddSectorOpen(true)}
              className="w-full px-3 py-2 border border-warn text-warn text-[10px] text-left"
            >
              ADD NEXT SECTOR
            </button>
            <SectorEditorModal
              open={addSectorOpen}
              onClose={() => setAddSectorOpen(false)}
            />
          </>
        )}
      </div>

      {/* ── Confirm LOST ── */}
      {lostConfirmId && (() => {
        const trooper = allTroopers.find(t => t.id === lostConfirmId)
        return (
          <ConfirmDialog
            open={true}
            title="TROOPER LOST"
            message={`Mark ${trooper?.name ?? 'trooper'} as dead and remove from active roster?`}
            confirmLabel="LOST"
            onConfirm={() => {
              updateTrooper(lostConfirmId, { status: 'dead', active: false })
              setLostConfirmId(null)
            }}
            onCancel={() => setLostConfirmId(null)}
            tone="danger"
          />
        )
      })()}

    </div>
  )
}

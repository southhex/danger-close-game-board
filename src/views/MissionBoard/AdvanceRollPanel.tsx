import { useMemo, useState, useEffect } from 'react'
import { useStore } from '../../store'
import {
  advanceModifier, advanceResult, woundCount, clampAmmo, isDeployed,
} from '../../utils/gameRules'
import { rollDice } from '../../utils/dice'
import { newId } from '../../utils/id'
import MobilityCheckPhase from './MobilityCheckPhase'
import SectorHeader from './SectorHeader'
import SectorEnteredBanner from './SectorEnteredBanner'
import type { AdvanceResult, OffensivePosition, Trooper } from '../../types'

type Phase =
  | { kind: 'setup' }
  | { kind: 'rolled'; total: number; result: AdvanceResult; dice: number[] }
  | { kind: 'mobility'; result: AdvanceResult; stealthWasActive: boolean; troopers: Trooper[] }

export default function AdvanceRollPanel() {
  const mission = useStore(s => s.mission)
  const troopers = useStore(s => s.troopers)
  const setMission = useStore(s => s.setMission)
  const applyAdvanceResult = useStore(s => s.applyAdvanceResult)
  const beginEngagement = useStore(s => s.beginEngagement)
  const overwhelmActiveSector = useStore(s => s.overwhelmActiveSector)
  const bypassActiveSector = useStore(s => s.bypassActiveSector)
  const addRoll = useStore(s => s.addRoll)
  const updateTrooper = useStore(s => s.updateTrooper)
  const clearTransition = useStore(s => s.clearTransition)

  const [assaultAmmo, setAssaultAmmo] = useState(0)
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' })
  const [showTable, setShowTable] = useState(false)
  // Press the Advance — per-trooper grit contributions (0 or 1 each, cap 5 total)
  const [pressContribs, setPressContribs] = useState<Record<string, 1>>({})
  const [pressed, setPressed] = useState(false)

  const activeTroopers = useMemo(() => troopers.filter(t => isDeployed(t, mission)), [troopers, mission])
  const wounds = useMemo(() => woundCount(activeTroopers), [activeTroopers])

  if (!mission) return null

  const droneBonus = activeTroopers.some(t => t.special_gear === 'Drone Gear') ? 1 : 0

  const activeSector = mission.sectors.find(s => s.id === mission.activeSectorId) ?? mission.sectors[0]

  const fromSector = mission.transitionFromSectorId
    ? mission.sectors.find(s => s.id === mission.transitionFromSectorId) ?? null
    : null
  const showBanner = fromSector !== null && phase.kind === 'setup'

  useEffect(() => {
    if (mission.transitionFromSectorId && !fromSector) {
      clearTransition()
    }
  }, [mission.transitionFromSectorId, fromSector, clearTransition])

  const mod = advanceModifier({
    advanceRolls: mission.advance_rolls,
    wounds,
    weather: activeSector.weather,
    tl: activeSector.tl,
    stealth: mission.stealth,
    assaultAmmo,
    droneBonus,
  })

  const setStealth = (v: boolean) => setMission({ stealth: v })

  const nextBonus = mission.nextAdvanceBonus ?? 0

  const roll = () => {
    clearTransition()
    if (nextBonus) setMission({ nextAdvanceBonus: undefined })
    const dice = rollDice(2, 6)
    const total = dice[0] + dice[1] + mod.total + nextBonus
    const result = advanceResult(total)
    addRoll({
      id: newId(), timestamp: Date.now(), label: 'Advance Roll',
      dice: '2d6', results: dice, modifier: mod.total, total,
    })
    setPhase({ kind: 'rolled', total, result, dice })
    setPressContribs({})
    setPressed(false)
  }

  const togglePressContrib = (id: string) => {
    setPressContribs(prev => {
      const next = { ...prev }
      if (next[id]) {
        delete next[id]
      } else {
        const currentCount = Object.keys(next).length
        if (currentCount >= 5) return prev
        next[id] = 1
      }
      return next
    })
  }

  const commitPress = () => {
    if (phase.kind !== 'rolled') return
    const ids = Object.keys(pressContribs)
    if (ids.length === 0) { setPressed(true); return }
    // Decrement grit on each contributing trooper
    for (const id of ids) {
      const t = activeTroopers.find(tr => tr.id === id)
      if (t && t.grit > 0) updateTrooper(id, { grit: t.grit - 1 })
    }
    const newTotal = phase.total + ids.length
    const newResult = advanceResult(newTotal)
    addRoll({
      id: newId(), timestamp: Date.now(), label: 'Press the Advance',
      dice: '0d0', results: ids.map((_, i) => i + 1), modifier: ids.length, total: newTotal,
    })
    setPhase({ kind: 'rolled', total: newTotal, result: newResult, dice: phase.dice })
    setPressed(true)
  }

  const proceedToMobility = () => {
    if (phase.kind !== 'rolled') return
    if (phase.result === 'overwhelm') {
      // OVERWHELM: no engagement, sector cleared, advance to next pending
      // (or land in catch_breath if none — user can ADD or END MISSION).
      overwhelmActiveSector()
      setPhase({ kind: 'setup' })
      setAssaultAmmo(0)
      return
    }
    setPhase({
      kind: 'mobility',
      result: phase.result,
      stealthWasActive: mission.stealth,
      troopers: activeTroopers,
    })
  }

  const onApplyMobility = (mapping: Record<string, OffensivePosition>, allPass: boolean) => {
    if (phase.kind !== 'mobility') return
    if (allPass) {
      // Sector bypassed — same outcome as overwhelm: clear and advance.
      bypassActiveSector()
      setPhase({ kind: 'setup' })
      setAssaultAmmo(0)
      return
    }
    applyAdvanceResult({ result: phase.result, trooperOffpos: mapping })
    beginEngagement()
    setPhase({ kind: 'setup' })
    setAssaultAmmo(0)
  }

  const onAssaultChange = (v: number) => {
    const clamped = clampAmmo(v)
    setAssaultAmmo(clamped)
    if (clamped > 0 && mission.stealth) setMission({ stealth: false })
  }

  return (
    <div className="bg-surface border border-border p-3">
      <SectorHeader sector={activeSector} />
      {showBanner && fromSector && (
        <SectorEnteredBanner
          fromSector={fromSector}
          toSector={activeSector}
          onDismiss={clearTransition}
        />
      )}
      <div className="flex items-center justify-between mb-2">
        <div className="lbl">ADVANCE ROLL</div>
        <button onClick={() => setShowTable(s => !s)} className="text-[10px] text-muted">
          {showTable ? '▴ HIDE' : '▾ RESULT TABLE'}
        </button>
      </div>

      {phase.kind === 'setup' && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="lbl text-[10px]">ROLLS</span>
              <button onClick={() => setMission({ advance_rolls: Math.max(0, mission.advance_rolls - 1) })} className="text-muted">−</button>
              <div className="bg-bg border border-border px-3 py-0.5 text-xs">{mission.advance_rolls}</div>
              <button onClick={() => setMission({ advance_rolls: mission.advance_rolls + 1 })} className="text-muted">+</button>
            </div>
            <label className="flex items-center gap-1 text-[10px] text-muted">
              <input type="checkbox" checked={mission.stealth} disabled={assaultAmmo > 0}
                onChange={e => setStealth(e.target.checked)} />
              STEALTH {mission.stealth && <span className="text-ok ml-1">ACTIVE</span>}
            </label>
            <label className="flex items-center gap-1 text-[10px] text-muted">
              ASSAULT:
              <input type="number" min={0} value={assaultAmmo}
                onChange={e => onAssaultChange(Number(e.target.value))}
                className="w-12 bg-bg border border-border text-ink px-2 py-0.5 font-mono" />
              ammo
            </label>
          </div>

          <div className="text-[10px] text-muted italic mb-2">
            Fatigue {mod.fatigue} · Wounds {mod.wounds} · Weather {mod.weather >= 0 ? `+${mod.weather}` : mod.weather}
            {' '}· TL {mod.tl} · Stealth {mod.stealth >= 0 ? `+${mod.stealth}` : mod.stealth}
            {' '}· Assault +{mod.assault}{droneBonus > 0 && ` · Drone +${mod.drone}`}
            {nextBonus > 0 && <span className="text-ok"> · Intel +{nextBonus}</span>}
            {' '}= <span className={mod.total + nextBonus < 0 ? 'text-bad' : 'text-ok'}>{(mod.total + nextBonus) >= 0 ? `+${mod.total + nextBonus}` : mod.total + nextBonus}</span>
          </div>

          <button onClick={roll} className="text-[11px] text-warn border border-warn px-3 py-1">ROLL 2D6 ▸</button>
        </>
      )}

      {phase.kind === 'rolled' && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] text-ink">
            ROLL: {phase.dice.join(' + ')} {mod.total >= 0 ? `+ ${mod.total}` : `− ${Math.abs(mod.total)}`}
            {pressed && Object.keys(pressContribs).length > 0 && (
              <> + <span className="text-warn">{Object.keys(pressContribs).length} (PRESS)</span></>
            )}
            {' '}= <span className="text-ok">{phase.total}</span>
          </div>
          <div className="text-[12px] text-warn tracking-wider">{phase.result.toUpperCase()}</div>

          {/* Press the Advance — SRD ch. 04. Skip if already pressed, or if Overwhelm (cap). */}
          {!pressed && phase.result !== 'overwhelm' && (() => {
            const contribCount = Object.keys(pressContribs).length
            const eligible = activeTroopers.filter(t => t.status !== 'bleedingout')
            const previewTotal = phase.total + contribCount
            const previewResult = advanceResult(previewTotal)
            const anyHaveGrit = eligible.some(t => t.grit > 0)
            if (!anyHaveGrit && contribCount === 0) {
              // No one can contribute — skip the panel entirely
              return (
                <div className="border-t border-border pt-2 mt-1">
                  <div className="text-[9px] text-muted italic">No grit available — Press the Advance unavailable.</div>
                </div>
              )
            }
            return (
              <div className="border-t border-border pt-2 mt-1 flex flex-col gap-2">
                <div className="lbl text-[10px]">PRESS THE ADVANCE — OPTIONAL</div>
                <div className="text-[9px] text-muted">
                  Each contributing trooper spends 1 grit for +1 to the result. Max +5.
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {eligible.map(t => {
                    const on = !!pressContribs[t.id]
                    const canToggleOn = !on && t.grit > 0 && contribCount < 5
                    return (
                      <button
                        key={t.id}
                        onClick={() => togglePressContrib(t.id)}
                        disabled={!on && !canToggleOn}
                        className={`text-[10px] px-2 py-0.5 border ${
                          on
                            ? 'border-warn text-warn'
                            : canToggleOn
                              ? 'border-border text-muted hover:text-ink'
                              : 'border-border text-muted opacity-30 cursor-not-allowed'
                        }`}
                        title={t.grit === 0 ? 'No grit' : on ? 'Click to remove' : 'Click to contribute 1 grit'}
                      >
                        {t.name} ({t.grit})
                      </button>
                    )
                  })}
                </div>
                {contribCount > 0 && (
                  <div className="text-[10px] text-muted">
                    +{contribCount} grit → new total {previewTotal} (<span className="text-warn">{previewResult.toUpperCase()}</span>)
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPressContribs({}); setPressed(true) }}
                    className="text-[10px] text-muted border border-border px-3 py-0.5 hover:text-ink"
                  >
                    SKIP — KEEP RESULT
                  </button>
                  <button
                    onClick={commitPress}
                    disabled={contribCount === 0}
                    className="text-[10px] text-warn border border-warn px-3 py-0.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-warn/10"
                  >
                    COMMIT +{contribCount} GRIT
                  </button>
                </div>
              </div>
            )
          })()}

          {pressed && Object.keys(pressContribs).length > 0 && (
            <div className="text-[9px] text-ok italic">
              Pressed +{Object.keys(pressContribs).length} → {phase.result.toUpperCase()}.
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setPhase({ kind: 'setup' }); setPressContribs({}); setPressed(false) }}
              className="text-[10px] text-muted border border-border px-3 py-1"
            >
              REDO
            </button>
            <button onClick={proceedToMobility} className="text-[10px] text-ok border border-ok px-3 py-1">
              {phase.result === 'overwhelm' ? 'CLEAR SECTOR & ADVANCE ▸' : 'CONTINUE TO MOBILITY CHECKS'}
            </button>
          </div>
        </div>
      )}

      {phase.kind === 'mobility' && (
        <MobilityCheckPhase
          troopers={phase.troopers}
          result={phase.result}
          stealthWasActive={phase.stealthWasActive}
          onApply={onApplyMobility}
          onCancel={() => setPhase({ kind: 'setup' })}
        />
      )}

      {showTable && (
        <div className="mt-3 border-t border-border pt-2 text-[10px] text-muted">
          <div>≤3 · AMBUSHED — momentum −1, all Flanked. PASS = Engaged, FAIL = Limited.</div>
          <div>4–7 · SPOTTED — momentum 0, all In Cover. PASS = Flanking, FAIL = Engaged.</div>
          <div>8–10 · SURPRISE — momentum +1, all Fortified. PASS = Flanking, FAIL = Engaged.</div>
          <div>≥11 · OVERWHELM — no engagement; momentum unchanged.</div>
          <div className="mt-1">All PASS → Sector Bypassed. Stealth active → floor(passes/2) Infiltration picks.</div>
        </div>
      )}
    </div>
  )
}

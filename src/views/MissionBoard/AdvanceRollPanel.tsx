import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import {
  advanceModifier, advanceResult, woundCount, clampAmmo,
} from '../../utils/gameRules'
import { rollDice } from '../../utils/dice'
import { newId } from '../../utils/id'
import MobilityCheckPhase from './MobilityCheckPhase'
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
  const addRoll = useStore(s => s.addRoll)

  const [assaultAmmo, setAssaultAmmo] = useState(0)
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' })
  const [showTable, setShowTable] = useState(false)

  const activeTroopers = useMemo(() => troopers.filter(t => t.active), [troopers])
  const wounds = useMemo(() => woundCount(troopers), [troopers])

  if (!mission) return null

  const droneBonus = activeTroopers.some(t => t.special_gear === 'Drone Gear') ? 1 : 0

  const mod = advanceModifier({
    advanceRolls: mission.advance_rolls,
    wounds,
    weather: mission.sector.weather,
    tl: mission.sector.tl,
    stealth: mission.stealth,
    assaultAmmo,
    droneBonus,
  })

  const setStealth = (v: boolean) => setMission({ stealth: v })

  const roll = () => {
    const dice = rollDice(2, 6)
    const total = dice[0] + dice[1] + mod.total
    const result = advanceResult(total)
    addRoll({
      id: newId(), timestamp: Date.now(), label: 'Advance Roll',
      dice: '2d6', results: dice, modifier: mod.total, total,
    })
    setPhase({ kind: 'rolled', total, result, dice })
  }

  const proceedToMobility = () => {
    if (phase.kind !== 'rolled') return
    if (phase.result === 'overwhelm') {
      applyAdvanceResult({ result: 'overwhelm' })
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

  const onApplyMobility = (mapping: Record<string, OffensivePosition>) => {
    if (phase.kind !== 'mobility') return
    applyAdvanceResult({ result: phase.result, trooperOffpos: mapping })
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
            {' '}= <span className={mod.total < 0 ? 'text-bad' : 'text-ok'}>{mod.total >= 0 ? `+${mod.total}` : mod.total}</span>
          </div>

          <button onClick={roll} className="text-[11px] text-warn border border-warn px-3 py-1">ROLL 2D6 ▸</button>
        </>
      )}

      {phase.kind === 'rolled' && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] text-ink">
            ROLL: {phase.dice.join(' + ')} {mod.total >= 0 ? `+ ${mod.total}` : `− ${Math.abs(mod.total)}`} = <span className="text-ok">{phase.total}</span>
          </div>
          <div className="text-[12px] text-warn tracking-wider">{phase.result.toUpperCase()}</div>
          <div className="flex gap-2">
            <button onClick={() => setPhase({ kind: 'setup' })} className="text-[10px] text-muted border border-border px-3 py-1">REDO</button>
            <button onClick={proceedToMobility} className="text-[10px] text-ok border border-ok px-3 py-1">
              {phase.result === 'overwhelm' ? 'APPLY — NO ENGAGEMENT' : 'CONTINUE TO MOBILITY CHECKS'}
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

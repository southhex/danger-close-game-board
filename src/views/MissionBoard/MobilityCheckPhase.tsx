import { useState } from 'react'
import { rollDie } from '../../utils/dice'
import { effectiveMobility, mobilityCheck, offposFromCheck, infiltrationPicks } from '../../utils/gameRules'
import type { Trooper, AdvanceResult, OffensivePosition } from '../../types'

interface Check { roll: number | null; pass: boolean | null }

interface Props {
  troopers: Trooper[]
  result: AdvanceResult
  stealthWasActive: boolean
  onApply: (trooperOffpos: Record<string, OffensivePosition>) => void
  onCancel: () => void
}

export default function MobilityCheckPhase({ troopers, result, stealthWasActive, onApply, onCancel }: Props) {
  const [checks, setChecks] = useState<Record<string, Check>>(
    () => Object.fromEntries(troopers.map(t => [t.id, { roll: null, pass: null }])),
  )

  const allRolled = troopers.every(t => checks[t.id].roll !== null)
  const passCount = troopers.filter(t => checks[t.id].pass === true).length
  const allPass = allRolled && passCount === troopers.length && troopers.length > 0
  const picks = infiltrationPicks(passCount, stealthWasActive)

  const rollOne = (t: Trooper) => {
    const r = rollDie(6)
    const pass = mobilityCheck(effectiveMobility(t), r)
    setChecks(c => ({ ...c, [t.id]: { roll: r, pass } }))
  }

  const apply = () => {
    const mapping: Record<string, OffensivePosition> = {}
    for (const t of troopers) {
      const c = checks[t.id]
      if (c.roll === null) continue
      mapping[t.id] = offposFromCheck(result, !!c.pass)
    }
    onApply(mapping)
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="lbl mb-2">MOBILITY CHECKS — {result.toUpperCase()}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {troopers.map(t => {
          const c = checks[t.id]
          const effMob = effectiveMobility(t)
          return (
            <div key={t.id} className="bg-bg border border-border p-2 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-ok">{t.name.toUpperCase()}</div>
                <div className="text-[9px] text-muted">MOB {effMob}</div>
              </div>
              {c.roll === null ? (
                <button onClick={() => rollOne(t)} className="text-[10px] text-warn border border-warn px-2 py-1">ROLL 1D6</button>
              ) : (
                <div className="text-[10px]">
                  <span className="text-ink mr-2">{c.roll}</span>
                  <span className={c.pass ? 'text-ok' : 'text-bad'}>{c.pass ? 'PASS' : 'FAIL'}</span>
                  <button onClick={() => rollOne(t)} className="text-[9px] text-muted ml-2 underline">re-roll</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {allPass && (
        <div className="bg-bg border border-ok p-2 mt-3">
          <div className="text-[11px] text-ok">SECTOR BYPASSED</div>
          <div className="text-[10px] text-muted">All troopers passed. No engagement this sector.</div>
          {picks > 0 && (
            <div className="text-[10px] text-warn mt-1">Stealth Infiltration: choose {picks} of Cut Comms / Target Commanders / Trap / Exit Route.</div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-3">
        <button onClick={onCancel} className="text-[10px] text-muted border border-border px-3 py-1">CANCEL</button>
        <button disabled={!allRolled} onClick={apply}
          className="text-[10px] text-ok border border-ok px-3 py-1 disabled:opacity-40">
          APPLY RESULT
        </button>
      </div>
    </div>
  )
}

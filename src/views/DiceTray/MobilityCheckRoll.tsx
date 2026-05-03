import { useState, useMemo } from 'react'
import { useStore } from '../../store'
import { rollDie } from '../../utils/dice'
import { effectiveMobility, mobilityCheck, isDeployed } from '../../utils/gameRules'
import { newId } from '../../utils/id'

export default function MobilityCheckRoll() {
  const allTroopers = useStore(s => s.troopers)
  const mission = useStore(s => s.mission)
  const troopers = useMemo(() => allTroopers.filter(t => isDeployed(t, mission)), [allTroopers, mission])
  const addRoll = useStore(s => s.addRoll)
  const [results, setResults] = useState<Record<string, { roll: number; pass: boolean }>>({})

  const roll = (id: string, name: string, effMob: number) => {
    const r = rollDie(6)
    const pass = mobilityCheck(effMob, r)
    setResults(p => ({ ...p, [id]: { roll: r, pass } }))
    addRoll({ id: newId(), timestamp: Date.now(), label: `${name} mob check`, dice: '1d6', results: [r], modifier: 0, total: r })
  }

  if (troopers.length === 0) return <div className="text-[11px] text-muted italic">No active troopers.</div>

  return (
    <div className="flex flex-col gap-2">
      {troopers.map(t => {
        const effMob = effectiveMobility(t)
        const r = results[t.id]
        return (
          <div key={t.id} className="flex items-center justify-between bg-bg border border-border rounded-lg px-2.5 py-2">
            <div>
              <div className="text-[12px] font-semibold">{t.name}</div>
              <div className="text-[10px] text-muted font-mono">MOB {effMob}</div>
            </div>
            <div className="flex items-center gap-2">
              {r && (
                <>
                  <span className="text-[12px] font-mono text-ink-dim">{r.roll}</span>
                  <span className={`text-[11px] font-bold ${r.pass ? 'text-ok' : 'text-bad'}`}>
                    {r.pass ? 'PASS' : 'FAIL'}
                  </span>
                </>
              )}
              <button onClick={() => roll(t.id, t.name, effMob)}
                className="text-[11px] font-semibold border border-border px-2.5 py-1 rounded-sm text-ink-dim hover:border-accent hover:text-accent">
                {r ? 'Re-roll' : 'Roll'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

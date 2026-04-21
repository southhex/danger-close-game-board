import { useState } from 'react'
import { useStore } from '../../store'
import { rollDie } from '../../utils/dice'
import { effectiveMobility, mobilityCheck } from '../../utils/gameRules'
import { newId } from '../../utils/id'

export default function MobilityCheckRoll() {
  const troopers = useStore(s => s.troopers.filter(t => t.active))
  const addRoll = useStore(s => s.addRoll)
  const [results, setResults] = useState<Record<string, { roll: number; pass: boolean }>>({})

  const roll = (id: string, name: string, effMob: number) => {
    const r = rollDie(6)
    const pass = mobilityCheck(effMob, r)
    setResults(p => ({ ...p, [id]: { roll: r, pass } }))
    addRoll({
      id: newId(), timestamp: Date.now(),
      label: `${name} mobility check`, dice: '1d6',
      results: [r], modifier: 0, total: r,
    })
  }

  if (troopers.length === 0) {
    return <div className="text-[10px] text-muted italic">No active troopers.</div>
  }

  return (
    <div className="flex flex-col gap-1">
      {troopers.map(t => {
        const effMob = effectiveMobility(t)
        const r = results[t.id]
        return (
          <div key={t.id} className="flex items-center justify-between text-[11px]">
            <div>
              <span className="text-ok">{t.name.toUpperCase()}</span>
              <span className="text-muted ml-2">MOB {effMob}</span>
            </div>
            <div className="flex items-center gap-2">
              {r && (
                <span className="text-[10px]">
                  <span className="text-ink">{r.roll}</span>{' '}
                  <span className={r.pass ? 'text-ok' : 'text-bad'}>{r.pass ? 'PASS' : 'FAIL'}</span>
                </span>
              )}
              <button onClick={() => roll(t.id, t.name, effMob)}
                className="text-[10px] text-warn border border-warn px-2 py-0.5">ROLL</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

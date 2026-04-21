import { useState } from 'react'
import { useStore } from '../../store'
import { rollDice } from '../../utils/dice'
import { newId } from '../../utils/id'

const DIE_TYPES = ['d3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', 'dx'] as const
type DieType = typeof DIE_TYPES[number]

function getSides(dieType: DieType, customSides: number): number {
  if (dieType === 'dx') return Math.max(2, customSides)
  if (dieType === 'd3') return 3
  return parseInt(dieType.slice(1))
}

export default function DiceControls() {
  const addRoll = useStore(s => s.addRoll)
  const [dieType, setDieType] = useState<DieType>('d6')
  const [count, setCount] = useState(2)
  const [customSides, setCustomSides] = useState(6)
  const [modifier, setModifier] = useState(0)
  const [label, setLabel] = useState('')
  const [lastRoll, setLastRoll] = useState<{
    results: number[]
    sides: number
    total: number
    isZero: boolean
  } | null>(null)

  const sides = getSides(dieType, customSides)
  const isD6Pool = dieType === 'd6' && count >= 2

  const doRoll = () => {
    const isZero = count === 0
    const rollCount = isZero ? 2 : count
    const results = rollDice(rollCount, sides)
    const total = isZero
      ? Math.min(...results)
      : results.reduce((a, b) => a + b, 0) + modifier

    setLastRoll({ results, sides, total, isZero })
    addRoll({
      id: newId(),
      timestamp: Date.now(),
      label: label || `${count}${dieType}`,
      dice: `${count}${dieType}`,
      results,
      modifier: isZero ? 0 : modifier,
      total,
    })
  }

  const highVal = lastRoll
    ? (lastRoll.isZero ? Math.min(...lastRoll.results) : Math.max(...lastRoll.results))
    : null

  return (
    <div className="flex flex-col gap-3">
      {/* Die type selector */}
      <div className="flex flex-wrap gap-1">
        {DIE_TYPES.map(d => (
          <button key={d} onClick={() => setDieType(d)}
            className={`text-[10px] border px-2 py-0.5 ${dieType === d ? 'border-warn text-warn' : 'border-border text-muted hover:text-ink'}`}>
            {d.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Custom sides input */}
      {dieType === 'dx' && (
        <div className="flex items-center gap-2">
          <span className="lbl text-[10px]">SIDES</span>
          <input type="number" min={2} max={999}
            className="w-16 bg-bg border border-border text-ink text-xs px-2 py-0.5 font-mono"
            value={customSides}
            onChange={e => setCustomSides(Math.max(2, parseInt(e.target.value) || 2))} />
        </div>
      )}

      {/* Count + modifier row */}
      <div className="flex gap-2 items-center flex-wrap">
        <span className="lbl text-[10px]">COUNT</span>
        <button onClick={() => setCount(c => Math.max(0, c - 1))} className="text-muted text-base leading-none">−</button>
        <div className="bg-bg border border-border px-2 py-0.5 text-xs min-w-[28px] text-center">{count}</div>
        <button onClick={() => setCount(c => Math.min(20, c + 1))} className="text-muted text-base leading-none">+</button>

        <span className="lbl text-[10px] ml-2">MOD</span>
        <button onClick={() => setModifier(m => Math.max(-5, m - 1))} className="text-muted text-base leading-none">−</button>
        <div className="bg-bg border border-border px-2 py-0.5 text-xs min-w-[32px] text-center">
          {modifier >= 0 ? `+${modifier}` : modifier}
        </div>
        <button onClick={() => setModifier(m => Math.min(5, m + 1))} className="text-muted text-base leading-none">+</button>
      </div>

      {/* Label + roll button */}
      <div className="flex gap-2">
        <input placeholder="label (optional)"
          className="flex-1 bg-bg border border-border text-ink text-xs px-2 py-0.5 font-mono"
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doRoll()} />
        <button onClick={doRoll}
          className="text-[11px] text-warn border border-warn px-3 py-1">ROLL</button>
      </div>

      {/* 0d hint */}
      {count === 0 && (
        <div className="text-[9px] text-muted italic">0d mode: rolling 2, taking lowest</div>
      )}

      {/* Results */}
      {lastRoll && (
        <div className="bg-bg border border-border p-2 flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1">
            {lastRoll.results.map((r, i) => {
              const highlight = r === highVal
              return (
                <div key={i}
                  className={`text-xs min-w-[26px] text-center border px-1.5 py-0.5 ${highlight ? 'border-warn text-warn' : 'border-border text-muted'}`}>
                  {r}
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 text-[10px]">
            <span className="text-muted">
              {lastRoll.isZero ? 'LOW' : 'HIGH'}:{' '}
              <span className="text-warn">{highVal}</span>
            </span>
            <span className="text-muted">
              TOTAL: <span className="text-ink">{lastRoll.total}</span>
            </span>
            {isD6Pool && lastRoll.sides === 6 && (
              <span className="text-muted">
                SIXES: <span className="text-warn">{lastRoll.results.filter(r => r === 6).length}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

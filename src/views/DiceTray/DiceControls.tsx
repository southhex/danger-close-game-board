import { useState } from 'react'
import { useStore } from '../../store'
import { rollDice } from '../../utils/dice'
import { newId } from '../../utils/id'

const QUICK = [
  { label: '2D6', count: 2, sides: 6 },
  { label: '1D6', count: 1, sides: 6 },
  { label: 'D66', count: 2, sides: 6, tens: true },
]

export default function DiceControls() {
  const addRoll = useStore(s => s.addRoll)
  const [modifier, setModifier] = useState(0)
  const [label, setLabel] = useState('')
  const [last, setLast] = useState<{ results: number[]; total: number; dice: string; doubles: boolean } | null>(null)

  const doRoll = (q: typeof QUICK[number]) => {
    const results = rollDice(q.count, q.sides)
    const isD66 = !!(q as { tens?: boolean }).tens
    const sum = isD66 ? results[0] * 10 + results[1] : results.reduce((a, b) => a + b, 0)
    const total = sum + (isD66 ? 0 : modifier)
    const doubles = !isD66 && q.count === 2 && results[0] === results[1]
    setLast({ results, total, dice: q.label.toLowerCase(), doubles })
    addRoll({
      id: newId(), timestamp: Date.now(),
      label: label || q.label, dice: q.label.toLowerCase(),
      results, modifier: isD66 ? 0 : modifier, total,
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {QUICK.map(q => (
          <button key={q.label} onClick={() => doRoll(q)}
            className="text-[11px] text-warn border border-warn px-3 py-1">{q.label}</button>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <span className="lbl text-[10px]">MOD</span>
        <button onClick={() => setModifier(m => Math.max(-5, m - 1))} className="text-muted">−</button>
        <div className="bg-bg border border-border px-3 py-0.5 text-xs min-w-[32px] text-center">{modifier}</div>
        <button onClick={() => setModifier(m => Math.min(5, m + 1))} className="text-muted">+</button>
        <input placeholder="label"
          className="flex-1 bg-bg border border-border text-ink text-xs px-2 py-0.5 font-mono"
          value={label} onChange={e => setLabel(e.target.value)} />
      </div>
      {last && (
        <div className="bg-bg border border-border p-2 text-xs">
          <span className="text-muted">{last.dice}</span>{' '}
          <span className="text-ink">{last.results.join(', ')}</span>
          {last.doubles && <span className="text-warn ml-2">DOUBLES</span>}
          <span className="ml-2 text-ok">= {last.total}</span>
        </div>
      )}
    </div>
  )
}

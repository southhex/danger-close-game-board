import { useStore } from '../../store'

export default function RollHistory() {
  const history = useStore(s => s.diceHistory)
  const clear = useStore(s => s.clearHistory)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <div className="lbl text-[10px]">HISTORY</div>
        <button onClick={clear} className="text-[9px] text-muted underline">clear</button>
      </div>
      <div className="max-h-[140px] overflow-auto flex flex-col gap-0.5">
        {history.length === 0 && <div className="text-[10px] text-muted italic">No rolls yet.</div>}
        {history.map(r => (
          <div key={r.id} className="flex justify-between text-[10px] bg-bg border border-border px-2 py-0.5">
            <span className="text-muted">{r.label}</span>
            <span className="text-ink">{r.dice} → {r.results.join(',')}{r.modifier ? ` ${r.modifier > 0 ? '+' : ''}${r.modifier}` : ''} = {r.total}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

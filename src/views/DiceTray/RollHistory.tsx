import { useStore } from '../../store'

export default function RollHistory() {
  const history = useStore(s => s.diceHistory)
  const clear   = useStore(s => s.clearHistory)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="lbl">History</div>
        <button onClick={clear} className="text-[10px] text-muted underline">clear</button>
      </div>
      <div className="max-h-[140px] overflow-auto flex flex-col gap-1">
        {history.length === 0
          ? <div className="text-[11px] text-subtle italic">No rolls yet.</div>
          : history.map(r => (
              <div key={r.id} className="flex justify-between items-baseline bg-bg border border-border rounded-sm px-2.5 py-1.5">
                <span className="text-[11px] text-muted truncate mr-3">{r.label}</span>
                <span className="text-[11px] font-mono shrink-0">
                  {r.results.join(', ')}
                  {r.modifier ? ` ${r.modifier > 0 ? '+' : ''}${r.modifier}` : ''}{' = '}
                  <span className="text-accent font-bold">{r.total}</span>
                  {r.note ? ` — ${r.note}` : ''}
                </span>
              </div>
            ))
        }
      </div>
    </div>
  )
}

import { useRef, useState } from 'react'
import { useStore } from '../../store'
import { rollDice } from '../../utils/dice'
import { newId } from '../../utils/id'

const SHAPE_SVG: Record<string, string> = {
  d3:   `<svg viewBox="0 0 473 473" xmlns="http://www.w3.org/2000/svg"><path class="db-path" d="M386 60H87C71 60 58 73 58 90v293c0 17 13 30 29 30h299c16 0 29-13 29-30V90c0-17-13-30-29-30z"/></svg>`,
  d4:   `<svg viewBox="0 0 532 473" xmlns="http://www.w3.org/2000/svg"><path class="db-path" d="M266 30L502 450H30Z"/></svg>`,
  d6:   `<svg viewBox="0 0 473 473" xmlns="http://www.w3.org/2000/svg"><path class="db-path" d="M386 60H87C71 60 58 73 58 90v293c0 17 13 30 29 30h299c16 0 29-13 29-30V90c0-17-13-30-29-30z"/></svg>`,
  d8:   `<svg viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg"><path class="db-path" d="M240 20L460 240 240 460 20 240Z"/></svg>`,
  d10:  `<svg viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg"><path class="db-path" d="M240 20L460 240 240 460 20 240Z"/></svg>`,
  d12:  `<svg viewBox="0 0 562 535" xmlns="http://www.w3.org/2000/svg"><path class="db-path" d="M281 30l183 95 70 149H28l70-149Z M28 274l70 149 183 82 183-82 70-149Z"/></svg>`,
  d20:  `<svg viewBox="0 0 512 591" xmlns="http://www.w3.org/2000/svg"><path class="db-path" d="M256 20l222 128v245L256 521 34 393V148Z"/></svg>`,
  d100: `<svg viewBox="0 0 532 532" xmlns="http://www.w3.org/2000/svg"><ellipse class="db-path" cx="266" cy="266" rx="220" ry="160"/></svg>`,
  dx:   `<svg viewBox="0 0 532 532" xmlns="http://www.w3.org/2000/svg"><ellipse class="db-path" cx="266" cy="266" rx="220" ry="160"/></svg>`,
}

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[50,50]],
  2: [[75,25],[25,75]],
  3: [[75,25],[50,50],[25,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,20],[75,20],[25,50],[75,50],[25,80],[75,80]],
}

const DIE_TYPES = ['d3','d4','d6','d8','d10','d12','d20','d100','dx'] as const
type DieType = typeof DIE_TYPES[number]

function getSides(dieType: DieType, customSides: number) {
  if (dieType === 'dx') return Math.max(2, customSides)
  if (dieType === 'd3') return 3
  return parseInt(dieType.slice(1))
}

const DIE_CSS = `
  .db-path { fill: oklch(0.255 0.006 130); stroke: oklch(0.26 0.005 130); stroke-width: 2; vector-effect: non-scaling-stroke; }
  .die-shell-high .db-path { fill: color-mix(in oklch, oklch(0.72 0.13 155) 16%, oklch(0.255 0.006 130)); stroke: oklch(0.72 0.13 155); stroke-width: 2.5; }
  .die-shell-dim { opacity: 0.28; }
  @keyframes dc-spin {
    0%   { transform: rotate(0deg)   scale(0.65); }
    55%  { transform: rotate(330deg) scale(1.1); }
    100% { transform: rotate(360deg) scale(1); }
  }
`

interface RollResult {
  results: number[]
  sides: number
  total: number
  isZero: boolean
}

export default function DiceControls() {
  const addRoll = useStore(s => s.addRoll)
  const [dieType, setDieType]         = useState<DieType>('d6')
  const [count, setCount]             = useState(2)
  const [customSides, setCustomSides] = useState(6)
  const [modifier, setModifier]       = useState(0)
  const [label, setLabel]             = useState('')
  const [lastRoll, setLastRoll]       = useState<RollResult | null>(null)
  const spinTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [spinKey, setSpinKey]         = useState(0)

  const sides  = getSides(dieType, customSides)
  const isD6   = dieType === 'd6'
  const isD3   = dieType === 'd3'
  const usePips = isD6 || isD3

  const doRoll = () => {
    const isZero  = count === 0
    const rollCnt = isZero ? 2 : count
    const results = rollDice(rollCnt, sides)
    const total   = isZero
      ? Math.min(...results)
      : results.reduce((a, b) => a + b, 0) + modifier

    setLastRoll({ results, sides, total, isZero })
    spinTimers.current.forEach(clearTimeout)
    spinTimers.current = []
    setSpinKey(k => k + 1)

    addRoll({
      id: newId(), timestamp: Date.now(),
      label: label || `${count}${dieType}`,
      dice: `${count}${dieType}`,
      results, modifier: isZero ? 0 : modifier, total,
    })
  }

  const highVal = lastRoll
    ? (lastRoll.isZero ? Math.min(...lastRoll.results) : Math.max(...lastRoll.results))
    : null

  const labelOffset = (type: DieType) => {
    if (type === 'd4')  return { transform: 'translateY(4px)' }
    if (type === 'd12') return { transform: 'translateY(2px)' }
    return {}
  }

  return (
    <>
      <style>{DIE_CSS}</style>

      <div className="flex flex-wrap gap-1.5 justify-center">
        {DIE_TYPES.map(d => (
          <button key={d} onClick={() => setDieType(d)}
            style={{ width: 34, height: 34, position: 'relative', flexShrink: 0, cursor: 'pointer' }}>
            <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              dangerouslySetInnerHTML={{ __html: SHAPE_SVG[d].replace(
                'class="db-path"',
                dieType === d
                  ? 'style="fill:color-mix(in oklch,oklch(0.72 0.13 155) 16%,oklch(0.255 0.006 130));stroke:oklch(0.72 0.13 155);stroke-width:2.5;vector-effect:non-scaling-stroke;"'
                  : 'style="fill:oklch(0.255 0.006 130);stroke:oklch(0.26 0.005 130);stroke-width:2;vector-effect:non-scaling-stroke;"'
              )}} />
            <span style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: d === 'd100' ? 6.5 : 8.5, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              color: dieType === d ? 'oklch(0.72 0.13 155)' : 'oklch(0.62 0.006 100)',
              ...labelOffset(d),
            }}>
              {d}
            </span>
          </button>
        ))}
      </div>

      {dieType === 'dx' && (
        <div className="flex items-center gap-2">
          <span className="lbl">Sides</span>
          <input type="number" min={2} max={999}
            className="w-16 bg-bg border border-border rounded-sm text-ink text-xs px-2 py-1 font-mono"
            value={customSides}
            onChange={e => setCustomSides(Math.max(2, parseInt(e.target.value) || 2))} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="lbl">Count</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCount(c => Math.max(0, c - 1))}
              className="w-7 h-7 flex items-center justify-center rounded-sm bg-surface2 border border-border text-ink-dim text-base hover:text-ink">−</button>
            <span className="flex-1 text-center font-mono text-base font-bold">{count}</span>
            <button onClick={() => setCount(c => Math.min(20, c + 1))}
              className="w-7 h-7 flex items-center justify-center rounded-sm bg-surface2 border border-border text-ink-dim text-base hover:text-ink">+</button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="lbl">Modifier</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModifier(m => Math.max(-5, m - 1))}
              className="w-7 h-7 flex items-center justify-center rounded-sm bg-surface2 border border-border text-ink-dim text-base hover:text-ink">−</button>
            <span className={`flex-1 text-center font-mono text-base font-bold
              ${modifier > 0 ? 'text-accent' : modifier < 0 ? 'text-wounded' : 'text-muted'}`}>
              {modifier >= 0 ? `+${modifier}` : modifier}
            </span>
            <button onClick={() => setModifier(m => Math.min(5, m + 1))}
              className="w-7 h-7 flex items-center justify-center rounded-sm bg-surface2 border border-border text-ink-dim text-base hover:text-ink">+</button>
          </div>
        </div>
      </div>

      {count === 0 && (
        <div className="text-[11px] text-muted italic text-center">0d mode — rolling 2, taking lowest</div>
      )}

      <div className="flex flex-col gap-2">
        <input placeholder="Label (optional)"
          className="w-full bg-bg border border-border rounded-sm text-ink text-xs px-2.5 py-1.5 outline-none focus:border-accent"
          value={label} onChange={e => setLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doRoll()} />
        <button onClick={doRoll}
          className="w-full py-2.5 bg-accent text-bg rounded-md font-semibold text-[13px] hover:brightness-110 active:scale-[0.98]">
          Roll Dice
        </button>
      </div>

      {lastRoll && (
        <div key={spinKey} className="flex flex-col items-center gap-3">
          {lastRoll.isZero && (
            <div className="text-[10px] text-muted uppercase tracking-wide">
              2{dieType} · take lowest
            </div>
          )}
          <div className="flex flex-wrap gap-2 justify-center">
            {lastRoll.results.map((val, i) => {
              const isHigh = lastRoll.isZero
                ? (val === Math.min(...lastRoll.results) && i === lastRoll.results.indexOf(Math.min(...lastRoll.results)))
                : val === highVal
              const isDim = lastRoll.isZero && !isHigh
              const shellClass = isHigh ? 'die-shell-high' : isDim ? 'die-shell-dim' : ''
              const isLarge = dieType === 'd100' || dieType === 'dx'
              const numOffset = dieType === 'd4' ? { transform: 'translateY(8px)' }
                              : dieType === 'd12' ? { transform: 'translateY(3px)' } : {}

              const animStyle: React.CSSProperties = {
                width: 52, height: 52, position: 'relative', flexShrink: 0,
                animation: `dc-spin 0.45s cubic-bezier(0.22,0.61,0.36,1) ${i * 45}ms both`,
              }

              return (
                <div key={i} className={shellClass} style={animStyle}>
                  <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                    dangerouslySetInnerHTML={{ __html: SHAPE_SVG[dieType] }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {usePips ? (
                      (PIP_LAYOUTS[Math.min(val, 6)] || PIP_LAYOUTS[1]).map(([x, y], pi) => (
                        <div key={pi} style={{
                          position: 'absolute', width: 8, height: 8, borderRadius: '50%',
                          background: isHigh ? 'oklch(0.72 0.13 155)' : 'oklch(0.78 0.006 90)',
                          left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)',
                        }} />
                      ))
                    ) : (
                      <span style={{
                        fontSize: isLarge ? 11 : 15, fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: isHigh ? 'oklch(0.72 0.13 155)' : 'oklch(0.94 0.006 90)',
                        position: 'relative', ...numOffset,
                      }}>
                        {val}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-1.5 flex-wrap justify-center">
            {lastRoll.isZero ? (
              <div className="flex flex-col items-center px-3 py-1.5 bg-surface2 border border-border rounded-sm">
                <span className="lbl text-[9px]">Result</span>
                <span className="font-mono text-[17px] font-bold text-accent">{Math.min(...lastRoll.results)}</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center px-3 py-1.5 bg-surface2 border border-border rounded-sm">
                  <span className="lbl text-[9px]">Highest</span>
                  <span className="font-mono text-[17px] font-bold text-accent">{highVal}</span>
                </div>
                <div className="flex flex-col items-center px-3 py-1.5 bg-surface2 border border-border rounded-sm">
                  <span className="lbl text-[9px]">Total</span>
                  <span className="font-mono text-[17px] font-bold">{lastRoll.total}</span>
                </div>
                {isD6 && lastRoll.results.filter(r => r === 6).length > 0 && (
                  <div className="flex flex-col items-center px-3 py-1.5 bg-surface2 border border-border rounded-sm">
                    <span className="lbl text-[9px]">Sixes</span>
                    <span className="font-mono text-[17px] font-bold text-accent">
                      {lastRoll.results.filter(r => r === 6).length}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

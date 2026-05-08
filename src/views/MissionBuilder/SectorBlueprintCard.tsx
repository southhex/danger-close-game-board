import type { MissionSector, SectorRole } from '../../types'
import { rollDie } from '../../utils/dice'

const ROLE_OPTIONS: { value: SectorRole; label: string }[] = [
  { value: 'standard',  label: 'Standard'  },
  { value: 'lz',        label: 'LZ'        },
  { value: 'ez',        label: 'EZ'        },
  { value: 'objective', label: 'Objective' },
]

const WEATHER_OPTIONS: { value: -2 | -1 | 0 | 1; label: string }[] = [
  { value: -2, label: '-2 Extreme'   },
  { value: -1, label: '-1 Harsh'     },
  { value:  0, label: '0 Clear'      },
  { value:  1, label: '+1 Favorable' },
]

// SRD: cover roll 1d6 → 1=0, 2-4=1, 5-6=2
function rollCover(): 0 | 1 | 2 {
  const d = rollDie(6)
  if (d === 1) return 0
  if (d <= 4) return 1
  return 2
}
// SRD: space roll 1d6 → 1=0, 2-4=1, 5-6=2 (same bracket)
function rollSpace(): 0 | 1 | 2 {
  return rollCover()
}
// TL roll: 1d6 → 1-2 TL1, 3-4 TL2, 5 TL3, 6 TL4
function rollTL(): 1 | 2 | 3 | 4 {
  const d = rollDie(6)
  if (d <= 2) return 1
  if (d <= 4) return 2
  if (d === 5) return 3
  return 4
}
// Weather: 1d6 → 1=-2, 2=-1, 3-5=0, 6=+1
function rollWeather(): -2 | -1 | 0 | 1 {
  const d = rollDie(6)
  if (d === 1) return -2
  if (d === 2) return -1
  if (d <= 5) return 0
  return 1
}

interface Props {
  sector: MissionSector
  index: number
  total: number
  onChange: (patch: Partial<MissionSector>) => void
  onMove: (delta: -1 | 1) => void
  onDelete: () => void
}

interface RollToggleProps {
  active: boolean
  onClick: () => void
  label: string
}

function RollToggle({ active, onClick, label }: RollToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-1.5 py-0.5 text-[10px] border font-mono font-bold ${
        active ? 'border-warn text-warn' : 'border-border text-muted'
      }`}
      aria-label={label}
    >?</button>
  )
}

export default function SectorBlueprintCard({ sector, index, total, onChange, onMove, onDelete }: Props) {
  const contentsType = sector.contentsType ?? 'engagement'
  const isEmpty = !sector.rollContents && contentsType === 'empty'
  const isTLVisible = sector.rollContents === true || (!sector.rollContents && contentsType === 'engagement')
  const showCoverSpace = !isEmpty

  return (
    <div className="bg-bg border border-border rounded-md p-3 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col -gap-px">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="px-1 text-[10px] text-muted hover:text-ink disabled:opacity-30 leading-none"
            aria-label="Move up"
          >▲</button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="px-1 text-[10px] text-muted hover:text-ink disabled:opacity-30 leading-none"
            aria-label="Move down"
          >▼</button>
        </div>
        <div className="text-[10px] text-subtle font-mono w-6">{index + 1}.</div>
        <input
          type="text"
          value={sector.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="Sector name"
          className="flex-1 bg-surface border border-border text-ink font-mono text-xs px-2 py-1 outline-none focus:border-warn"
        />
        <select
          value={sector.role ?? 'standard'}
          onChange={e => onChange({ role: e.target.value as SectorRole })}
          className="bg-surface border border-border text-ink font-mono text-xs px-2 py-1"
        >
          {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          type="button"
          onClick={onDelete}
          className="px-2 py-1 text-[11px] border border-bad text-bad font-mono"
          aria-label="Delete sector"
        >×</button>
      </div>

      {/* Description */}
      <div>
        <div className="lbl text-[10px] mb-1">DESCRIPTION</div>
        <input
          type="text"
          value={sector.description ?? ''}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Short description"
          className="w-full bg-surface border border-border text-ink font-mono text-xs px-2 py-1 outline-none focus:border-warn"
        />
      </div>

      {/* Contents type row */}
      <div>
        <div className="lbl text-[10px] mb-1">CONTENTS</div>
        <div className="flex gap-1 items-center">
          <div className={`flex gap-1 ${sector.rollContents ? 'opacity-40' : ''}`}>
            {(['engagement', 'boon', 'empty'] as const).map(ct => (
              <button
                type="button"
                key={ct}
                disabled={!!sector.rollContents}
                onClick={() => onChange({ contentsType: ct })}
                className={`px-2 py-0.5 text-[10px] border font-mono uppercase ${
                  contentsType === ct ? 'border-warn text-warn' : 'border-border text-muted'
                }`}
              >{ct}</button>
            ))}
          </div>
          <RollToggle
            active={!!sector.rollContents}
            onClick={() => onChange({ rollContents: !sector.rollContents })}
            label="Roll contents on entry"
          />
        </div>
      </div>

      {/* Cover row */}
      {showCoverSpace && (
        <div>
          <div className="lbl text-[10px] mb-1 flex items-center gap-2">
            <span>COVER</span>
            <button
              type="button"
              onClick={() => onChange({ cover: rollCover() })}
              className="text-[10px] text-muted hover:text-warn font-mono"
              aria-label="Roll cover"
            >⬡</button>
          </div>
          <div className="flex gap-1 items-center">
            <div className={`flex gap-1 ${sector.rollCover ? 'opacity-40' : ''}`}>
              {([0, 1, 2] as const).map(v => (
                <button
                  type="button"
                  key={v}
                  disabled={!!sector.rollCover}
                  onClick={() => onChange({ cover: v })}
                  className={`px-2 py-0.5 text-[10px] border font-mono ${
                    sector.cover === v ? 'border-warn text-warn' : 'border-border text-muted'
                  }`}
                >{v}</button>
              ))}
            </div>
            <RollToggle
              active={!!sector.rollCover}
              onClick={() => onChange({ rollCover: !sector.rollCover })}
              label="Roll cover on entry"
            />
          </div>
        </div>
      )}

      {/* Space row */}
      {showCoverSpace && (
        <div>
          <div className="lbl text-[10px] mb-1 flex items-center gap-2">
            <span>SPACE</span>
            <button
              type="button"
              onClick={() => onChange({ space: rollSpace() })}
              className="text-[10px] text-muted hover:text-warn font-mono"
              aria-label="Roll space"
            >⬡</button>
          </div>
          <div className="flex gap-1 items-center">
            <div className={`flex gap-1 ${sector.rollSpace ? 'opacity-40' : ''}`}>
              {([0, 1, 2] as const).map(v => (
                <button
                  type="button"
                  key={v}
                  disabled={!!sector.rollSpace}
                  onClick={() => onChange({ space: v })}
                  className={`px-2 py-0.5 text-[10px] border font-mono ${
                    sector.space === v ? 'border-warn text-warn' : 'border-border text-muted'
                  }`}
                >{v}</button>
              ))}
            </div>
            <RollToggle
              active={!!sector.rollSpace}
              onClick={() => onChange({ rollSpace: !sector.rollSpace })}
              label="Roll space on entry"
            />
          </div>
        </div>
      )}

      {/* TL row */}
      {isTLVisible && (
        <div>
          <div className="lbl text-[10px] mb-1 flex items-center gap-2">
            <span>TL</span>
            <button
              type="button"
              onClick={() => onChange({ tl: rollTL() })}
              className="text-[10px] text-muted hover:text-warn font-mono"
              aria-label="Roll TL"
            >⬡</button>
          </div>
          <div className="flex gap-1 items-center">
            <div className={`flex gap-1 ${sector.rollTL ? 'opacity-40' : ''}`}>
              {([1, 2, 3, 4] as const).map(v => (
                <button
                  type="button"
                  key={v}
                  disabled={!!sector.rollTL}
                  onClick={() => onChange({ tl: v })}
                  className={`px-2 py-0.5 text-[10px] border font-mono ${
                    sector.tl === v ? 'border-warn text-warn' : 'border-border text-muted'
                  }`}
                >{v}</button>
              ))}
            </div>
            <RollToggle
              active={!!sector.rollTL}
              onClick={() => onChange({ rollTL: !sector.rollTL })}
              label="Roll TL on entry"
            />
          </div>
        </div>
      )}

      {/* Weather (always shown, no ? button) */}
      <div>
        <div className="lbl text-[10px] mb-1 flex items-center gap-2">
          <span>WEATHER</span>
          <button
            type="button"
            onClick={() => onChange({ weather: rollWeather() })}
            className="text-[10px] text-muted hover:text-warn font-mono"
            aria-label="Roll weather"
          >⬡</button>
        </div>
        <select
          value={sector.weather}
          onChange={e => onChange({ weather: Number(e.target.value) as -2 | -1 | 0 | 1 })}
          className="w-full bg-surface border border-border text-ink font-mono text-xs px-2 py-1"
        >
          {WEATHER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  )
}

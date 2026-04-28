import type { MissionSector } from '../../types'
import { weatherLabel } from '../../utils/gameRules'

interface Props {
  fromSector: MissionSector
  toSector: MissionSector
  onDismiss: () => void
}

interface Delta {
  label: string
  from: string
  to: string
  changed: boolean
}

function buildDeltas(from: MissionSector, to: MissionSector): Delta[] {
  return [
    { label: 'COVER',   from: `C${from.cover}`,  to: `C${to.cover}`,   changed: from.cover !== to.cover },
    { label: 'SPACE',   from: `S${from.space}`,  to: `S${to.space}`,   changed: from.space !== to.space },
    { label: 'TL',      from: `TL${from.tl}`,    to: `TL${to.tl}`,     changed: from.tl !== to.tl },
    { label: 'WEATHER', from: weatherLabel(from.weather), to: weatherLabel(to.weather), changed: from.weather !== to.weather },
  ]
}

export default function SectorEnteredBanner({ fromSector, toSector, onDismiss }: Props) {
  const deltas = buildDeltas(fromSector, toSector)
  const changed = deltas.filter(d => d.changed)

  return (
    <div className="border border-warn/60 bg-bg p-2 mb-3 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="lbl text-[10px] text-warn">
          ENTERED {toSector.name.toUpperCase()}
        </div>
        <button
          onClick={onDismiss}
          className="text-[10px] text-muted px-2 border border-border"
          aria-label="Dismiss banner"
        >
          DISMISS
        </button>
      </div>
      {changed.length > 0 ? (
        <div className="text-[10px] text-ink flex flex-wrap gap-x-3 gap-y-0.5">
          {changed.map(d => (
            <span key={d.label}>
              <span className="text-muted">{d.label}:</span> {d.from} → <span className="text-warn">{d.to}</span>
            </span>
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-muted">
          Same parameters as {fromSector.name}.
        </div>
      )}
    </div>
  )
}

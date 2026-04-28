import type { MissionSector } from '../../types'
import { weatherLabel } from '../../utils/gameRules'

interface Props {
  sector: MissionSector
}

const STATUS_COLOR: Record<MissionSector['status'], string> = {
  pending: 'text-muted',
  active: 'text-ok',
  cleared: 'text-muted opacity-60',
}

export default function SectorHeader({ sector }: Props) {
  const { name, cover, space, tl, weather, status } = sector
  const notation = `C${cover}/S${space}/TL${tl}`
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono mb-2">
      <span className={`tracking-wider ${STATUS_COLOR[status]}`}>
        SECTOR {name.toUpperCase()}
      </span>
      <span className="text-muted">·</span>
      <span className="text-ink">{notation}</span>
      <span className="text-muted">·</span>
      <span className="text-ink">{weatherLabel(weather)}</span>
      <span className="text-muted">·</span>
      <span className={`uppercase ${STATUS_COLOR[status]}`}>{status}</span>
    </div>
  )
}

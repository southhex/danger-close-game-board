import { Dropdown } from '../../components'
import { useStore } from '../../store'
import { clampMomentum, fortifiedLimit, flankingLimit } from '../../utils/gameRules'

const COVER_OPTS = [
  { value: '0', label: '0 – Exposed' },
  { value: '1', label: '1 – Normal' },
  { value: '2', label: '2 – Dense' },
]
const SPACE_OPTS = [
  { value: '0', label: '0 – Tight' },
  { value: '1', label: '1 – Transitional' },
  { value: '2', label: '2 – Open' },
]
const TL_OPTS = [
  { value: '1', label: '1 – Light' },
  { value: '2', label: '2 – Standard' },
  { value: '3', label: '3 – Heavy' },
  { value: '4', label: '4 – Overwhelming' },
]
const WEATHER_OPTS = [
  { value: '-2', label: '−2 – Terrible' },
  { value: '-1', label: '−1 – Bad' },
  { value: '0', label: '0 – Clear' },
  { value: '1', label: '+1 – Advantaged' },
]

const MOMENTUM_LABEL: Record<number, string> = {
  '-3': 'ROUTED', '-2': 'PINNED', '-1': 'LOSING', '0': 'CONTESTED',
  '1': 'GAINING', '2': 'DOMINANT', '3': 'OVERRUNNING',
}

export default function SectorMomentumPanel() {
  const mission = useStore(s => s.mission)
  const setMission = useStore(s => s.setMission)
  if (!mission) return null

  const { cover, space, tl, weather } = mission.sector
  const setSector = (patch: Partial<typeof mission.sector>) =>
    setMission({ sector: { ...mission.sector, ...patch } })

  const fortLimit = fortifiedLimit(cover)
  const flanklimit = flankingLimit(space)
  const constraintText =
    `Cover ${cover}: ${fortLimit === Infinity ? 'no limit' : `max ${fortLimit} Fortified`} · ` +
    `Space ${space}: ${flanklimit === Infinity ? 'no limit' : `max ${flanklimit} Flanking`}`

  return (
    <div className="bg-surface border border-border p-3">
      <div className="lbl mb-3">SECTOR &amp; MOMENTUM</div>
      <div className="flex gap-4 items-start">
        <div className="grid grid-cols-2 gap-2 flex-1">
          <Dropdown label="COVER" value={String(cover)} options={COVER_OPTS} onChange={v => setSector({ cover: Number(v) as 0 | 1 | 2 })} />
          <Dropdown label="SPACE" value={String(space)} options={SPACE_OPTS} onChange={v => setSector({ space: Number(v) as 0 | 1 | 2 })} />
          <Dropdown label="THREAT" value={String(tl)} options={TL_OPTS} onChange={v => setSector({ tl: Number(v) as 1 | 2 | 3 | 4 })} />
          <Dropdown label="WEATHER" value={String(weather)} options={WEATHER_OPTS} onChange={v => setSector({ weather: Number(v) as -2 | -1 | 0 | 1 })} />
        </div>
        <div className="w-px bg-border self-stretch" />
        <div className="flex flex-col items-center justify-center min-w-[110px] gap-2">
          <div className="lbl text-[10px]">MOMENTUM</div>
          <div className="flex items-center gap-3">
            <button onClick={() => setMission({ momentum: clampMomentum(mission.momentum - 1) })} className="text-muted text-lg leading-none">◀</button>
            <div className="text-center">
              <div className="text-ink text-lg font-bold">{mission.momentum >= 0 ? `+${mission.momentum}` : mission.momentum}</div>
              <div className="text-[9px] tracking-wider text-neutral mt-0.5">{MOMENTUM_LABEL[mission.momentum]}</div>
            </div>
            <button onClick={() => setMission({ momentum: clampMomentum(mission.momentum + 1) })} className="text-muted text-lg leading-none">▶</button>
          </div>
        </div>
      </div>
      <div className="text-[10px] text-muted italic mt-3">{constraintText}</div>
    </div>
  )
}

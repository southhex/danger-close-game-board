import type { MissionSector, MissionState } from '../../types'
import { weatherLabel } from '../../utils/gameRules'

interface Props {
  fromSector: MissionSector
  toSector: MissionSector
  mission: MissionState
  onConfirm: () => void
}

function diff<T>(from: T, to: T, fmt: (v: T) => string): string {
  return from === to ? fmt(to) : `${fmt(from)} → ${fmt(to)}`
}

export default function AdvancePreview({ fromSector, toSector, mission, onConfirm }: Props) {
  const coverLine   = diff(fromSector.cover, toSector.cover, v => `C${v}`)
  const spaceLine   = diff(fromSector.space, toSector.space, v => `S${v}`)
  const tlLine      = diff(fromSector.tl, toSector.tl, v => `TL${v}`)
  const weatherLine = diff(fromSector.weather, toSector.weather, v => weatherLabel(v as -2 | -1 | 0 | 1))

  const stealthCarry  = mission.stealth ? 'STEALTH ACTIVE' : null
  const momentumCarry = mission.momentum !== 0
    ? `MOMENTUM ${mission.momentum > 0 ? `+${mission.momentum}` : mission.momentum}`
    : null

  return (
    <div className="border border-ok/60 p-2 flex flex-col gap-2">
      <div className="lbl text-[10px] text-ok">ADVANCE — {fromSector.name.toUpperCase()} → {toSector.name.toUpperCase()}</div>

      <div className="text-[10px] text-ink flex flex-wrap gap-x-3 gap-y-0.5">
        <span>{coverLine}</span>
        <span>{spaceLine}</span>
        <span>{tlLine}</span>
        <span>{weatherLine}</span>
      </div>

      <div className="text-[10px] text-muted flex flex-wrap gap-x-3 gap-y-0.5">
        <span className="text-muted">CARRIES:</span>
        <span>all trooper grit / ammo / status</span>
        {stealthCarry && <span className="text-warn">{stealthCarry}</span>}
        {momentumCarry && <span className="text-warn">{momentumCarry}</span>}
      </div>

      <div className="text-[10px] text-muted flex flex-wrap gap-x-3 gap-y-0.5">
        <span className="text-muted">RESETS:</span>
        <span>suppression</span>
        <span>def modifiers</span>
        <span>Jump Pack uses</span>
        <span>advance fatigue</span>
      </div>

      <button
        onClick={onConfirm}
        className="self-stretch px-3 py-2 border border-ok text-ok text-[10px] text-left mt-1"
      >
        ADVANCE TO {toSector.name.toUpperCase()} →
      </button>
    </div>
  )
}

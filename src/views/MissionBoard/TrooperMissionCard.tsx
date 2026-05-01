import { memo, useMemo } from 'react'
import { Dropdown, PipTracker } from '../../components'
import { STATUS_COLOR } from '../../components/StatusBadge'
import { TOKEN } from '../../utils/tokens'
import { canSetDefpos, canSetOffpos } from '../../utils/gameRules'
import { useStore } from '../../store'
import type { Trooper, TrooperStatus, OffensivePosition, DefensivePosition } from '../../types'

const STATUS_OPTS: { value: TrooperStatus; label: string }[] = [
  { value: 'ok', label: 'OK' }, { value: 'grazed', label: 'GRAZED' },
  { value: 'wounded', label: 'WOUNDED' }, { value: 'bleedingout', label: 'BLEEDING OUT' },
  { value: 'dead', label: 'DEAD' },
]
const OFFPOS: { value: OffensivePosition; label: string }[] = [
  { value: 'limited', label: 'LIMITED' },
  { value: 'engaged', label: 'ENGAGED' },
  { value: 'flanking', label: 'FLANKING' },
]
const DEFPOS: { value: DefensivePosition; label: string }[] = [
  { value: 'flanked', label: 'FLANKED' },
  { value: 'incover', label: 'IN COVER' },
  { value: 'fortified', label: 'FORTIFIED' },
]

interface Props {
  trooper: Trooper
  squad: Trooper[]
  cover: 0 | 1 | 2
  space: 0 | 1 | 2
  onExpand: (id: string) => void
  expanded: boolean
}

const TrooperMissionCard = memo(function TrooperMissionCard({
  trooper, squad, cover, space, onExpand, expanded,
}: Props) {
  const updateTrooper = useStore(s => s.updateTrooper)

  const color = STATUS_COLOR[trooper.status]
  const dim = trooper.status === 'dead' ? 'opacity-50' : ''

  const offOpts = useMemo(() => OFFPOS.map(o => ({
    ...o,
    disabled: o.value !== trooper.offpos && !canSetOffpos(trooper, o.value, squad, space),
  })), [trooper, squad, space])

  const defOpts = useMemo(() => DEFPOS.map(o => ({
    ...o,
    disabled: o.value !== trooper.defpos && !canSetDefpos(trooper, o.value, squad, cover),
  })), [trooper, squad, cover])

  return (
    <div className={`bg-bg border flex-shrink-0 w-[180px] snap-start rounded-xl overflow-hidden ${dim} ${expanded ? 'border-accent' : 'border-border'}`}>
      <div style={{ height: 3, background: color }} />
      <div className="p-2.5 flex flex-col gap-1.5">
        {/* Header: name / callsign / suppression dot / expand */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <div className="text-[13px] font-semibold truncate">{trooper.name}</div>
            <div className="text-[9px] text-muted shrink-0">{trooper.callsign}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Suppression indicator dot */}
            <div
              title={trooper.suppressed ? 'SUPPRESSED' : ''}
              className={`w-[7px] h-[7px] rounded-pill border ${
                trooper.suppressed ? 'bg-warn border-warn' : 'border-border'
              }`}
            />
            {/* Expand button */}
            <button
              onClick={() => onExpand(trooper.id)}
              className="text-[11px] text-muted hover:text-ink leading-none px-0.5"
              title="DETAIL"
            >›</button>
          </div>
        </div>

        {/* Status */}
        <Dropdown
          value={trooper.status}
          options={STATUS_OPTS}
          onChange={v => updateTrooper(trooper.id, { status: v as TrooperStatus })}
          label="STATUS"
        />

        {/* Offensive + Defensive side by side */}
        <div className="grid grid-cols-2 gap-1">
          <Dropdown
            value={trooper.offpos}
            options={offOpts}
            onChange={v => updateTrooper(trooper.id, { offpos: v as OffensivePosition })}
            label="OFF"
          />
          <Dropdown
            value={trooper.defpos}
            options={defOpts}
            onChange={v => updateTrooper(trooper.id, { defpos: v as DefensivePosition })}
            label="DEF"
          />
        </div>

        {/* Grit + Ammo */}
        <div className="flex gap-3">
          <PipTracker label="GRIT" value={trooper.grit} max={trooper.grit_max}
            color={TOKEN.ok}
            onChange={v => updateTrooper(trooper.id, { grit: v })} />
          <PipTracker label="AMMO" value={trooper.ammo} max={trooper.ammo_max}
            color={TOKEN.warn}
            onChange={v => updateTrooper(trooper.id, { ammo: v })} />
        </div>
      </div>
    </div>
  )
})
export default TrooperMissionCard

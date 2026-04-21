import { memo, useMemo, useState } from 'react'
import { Dropdown, PipTracker, Stepper, GearPopover, TextPopover } from '../../components'
import { STATUS_COLOR } from '../../components/StatusBadge'
import { gearByName } from '../../data/gear'
import { tagByName } from '../../data/tags'
import {
  effectiveMobility, flankingBonus, canSetDefpos, canSetOffpos, clampUses, lookupRollTable,
} from '../../utils/gameRules'
import { rollDie } from '../../utils/dice'
import { newId } from '../../utils/id'
import { useStore } from '../../store'
import type {
  Trooper, TrooperStatus, OffensivePosition, DefensivePosition, GearItem,
} from '../../types'

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
}

const TrooperMissionCard = memo(function TrooperMissionCard({ trooper, squad, cover, space }: Props) {
  const updateTrooper = useStore(s => s.updateTrooper)
  const addRoll = useStore(s => s.addRoll)
  const [rollResults, setRollResults] = useState<Record<string, { roll: number; result: string }>>({})

  const handleRollTable = (gearName: string, table: NonNullable<GearItem['roll_table']>) => {
    const roll = rollDie(table.sides)
    const result = lookupRollTable(table.entries, roll)
    setRollResults(prev => ({ ...prev, [gearName]: { roll, result } }))
    addRoll({
      id: newId(), timestamp: Date.now(),
      label: gearName, dice: `1d${table.sides}`,
      results: [roll], modifier: 0, total: roll,
    })
  }

  const effMob = effectiveMobility(trooper)
  const flk = flankingBonus(effMob)
  const color = STATUS_COLOR[trooper.status]

  const armor = gearByName(trooper.armor)
  const weapon = gearByName(trooper.weapon)
  const sw = gearByName(trooper.special_weapon)
  const sg = gearByName(trooper.special_gear)

  const offOpts = useMemo(() => OFFPOS.map(o => ({
    ...o,
    disabled: o.value !== trooper.offpos && !canSetOffpos(trooper, o.value, squad, space),
  })), [trooper.offpos, trooper, squad, space])

  const defOpts = useMemo(() => DEFPOS.map(o => ({
    ...o,
    disabled: o.value !== trooper.defpos && !canSetDefpos(trooper, o.value, squad, cover),
  })), [trooper.defpos, trooper, squad, cover])

  const dim = trooper.status === 'dead' ? 'opacity-50' : ''

  return (
    <div className={`bg-bg border border-border flex-shrink-0 w-[180px] snap-start ${dim}`}
      style={{ borderTop: `3px solid ${color}` }}>
      <div className="p-2 flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <div className="text-ok text-[11px] tracking-wider">{trooper.name.toUpperCase()}</div>
          <div className="text-[9px] text-muted">{trooper.callsign}</div>
        </div>

        <Dropdown label="STATUS" value={trooper.status} options={STATUS_OPTS}
          onChange={v => updateTrooper(trooper.id, { status: v as TrooperStatus })} />

        <div className="flex gap-3">
          <PipTracker label="GRIT" value={trooper.grit} max={trooper.grit_max}
            onChange={v => updateTrooper(trooper.id, { grit: v })} />
          <PipTracker label="AMMO" value={trooper.ammo} max={trooper.ammo_max}
            onChange={v => updateTrooper(trooper.id, { ammo: v })} />
        </div>

        <Dropdown label="OFFENSIVE" value={trooper.offpos} options={offOpts}
          onChange={v => updateTrooper(trooper.id, { offpos: v as OffensivePosition })} />
        <Dropdown label="DEFENSIVE" value={trooper.defpos} options={defOpts}
          onChange={v => updateTrooper(trooper.id, { defpos: v as DefensivePosition })} />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1 text-[9px] text-muted">
            <input type="checkbox" checked={trooper.suppressed}
              onChange={e => updateTrooper(trooper.id, { suppressed: e.target.checked })} />
            SUPPR.
          </label>
          <Stepper label="DEF" value={trooper.def_modifier}
            onChange={v => updateTrooper(trooper.id, { def_modifier: v })} min={-5} max={5} />
        </div>

        <div className="border-t border-border mt-1 pt-1 flex flex-col gap-0.5 text-[9px] text-muted">
          {armor && (
            <GearPopover gear={armor}>
              <div className="text-ink">{armor.name.toUpperCase()}</div>
            </GearPopover>
          )}
          {weapon && (
            <GearPopover gear={weapon}>
              <div>{weapon.name.toUpperCase()}</div>
            </GearPopover>
          )}
          {sw && (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <GearPopover gear={sw}><div>{sw.name.toUpperCase()}</div></GearPopover>
                <div className="flex items-center gap-1">
                  {sw.roll_table && (
                    <button
                      onClick={() => handleRollTable(sw.name, sw.roll_table!)}
                      className="text-[9px] text-warn border border-warn px-1 py-0.5">ROLL</button>
                  )}
                  {sw.max_uses > 0 && (
                    <PipTracker value={trooper.special_weapon_uses < 0 ? 0 : trooper.special_weapon_uses}
                      max={sw.max_uses}
                      onChange={v => updateTrooper(trooper.id, { special_weapon_uses: clampUses(v, sw.max_uses) })}
                      size={8} color="#c8a030" />
                  )}
                </div>
              </div>
              {rollResults[sw.name] && (
                <div className="text-[9px] text-warn">
                  d{sw.roll_table?.sides}: {rollResults[sw.name].roll} → {rollResults[sw.name].result}
                </div>
              )}
            </div>
          )}
          {sg && (
            <div className="flex items-center justify-between">
              <GearPopover gear={sg}><div>{sg.name.toUpperCase()}</div></GearPopover>
              {sg.max_uses > 0 && (
                <PipTracker value={trooper.special_gear_uses < 0 ? 0 : trooper.special_gear_uses}
                  max={sg.max_uses}
                  onChange={v => updateTrooper(trooper.id, { special_gear_uses: clampUses(v, sg.max_uses) })}
                  size={8} color="#c8a030" />
              )}
            </div>
          )}
        </div>

        {(trooper.tag || trooper.perks.length > 0) && (
          <div className="flex flex-wrap gap-1 border-t border-border pt-1">
            {trooper.tag && (() => {
              const tagData = tagByName(trooper.tag)
              return tagData ? (
                <TextPopover title={tagData.name} body={tagData.description}>
                  <span className="text-[9px] border border-border px-1 text-muted uppercase tracking-wider">
                    {tagData.name}
                  </span>
                </TextPopover>
              ) : null
            })()}
            {trooper.perks.map((perk, i) => (
              <TextPopover key={i} title={perk.name} body={perk.description || 'No description.'}>
                <span className="text-[9px] border border-border px-1 text-muted uppercase tracking-wider">
                  {perk.name}
                </span>
              </TextPopover>
            ))}
          </div>
        )}

        <div className="flex justify-between text-[10px] border-t border-border pt-1">
          <span className={effMob < trooper.mobility ? 'text-wound' : 'text-ink'}>MOB {effMob}</span>
          <span className="text-ok">FLK +{flk}</span>
        </div>
      </div>
    </div>
  )
})
export default TrooperMissionCard

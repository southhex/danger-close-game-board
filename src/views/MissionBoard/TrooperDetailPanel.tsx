import { memo } from 'react'
import { Stepper, GearPopover, TextPopover, PipTracker, useToast } from '../../components'
import { gearByName } from '../../data/gear'
import { tagByName } from '../../data/tags'
import { effectiveMobility, flankingBonus, clampUses, lookupRollTable } from '../../utils/gameRules'
import { rollDie } from '../../utils/dice'
import { newId } from '../../utils/id'
import { useStore } from '../../store'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { TOKEN } from '../../utils/tokens'
import type { Trooper, GearItem } from '../../types'

interface Props {
  trooper: Trooper
  onClose: () => void
}

const TrooperDetailPanel = memo(function TrooperDetailPanel({ trooper, onClose }: Props) {
  const updateTrooper = useStore(s => s.updateTrooper)
  const addRoll = useStore(s => s.addRoll)
  const { showToast } = useToast()
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const handleRollTable = (gearName: string, table: NonNullable<GearItem['roll_table']>) => {
    const roll = rollDie(table.sides)
    const result = lookupRollTable(table.entries, roll)
    showToast(`${gearName.toUpperCase()} — d${table.sides}: ${roll} → ${result}`)
    addRoll({
      id: newId(), timestamp: Date.now(),
      label: gearName, dice: `1d${table.sides}`,
      results: [roll], modifier: 0, total: roll, note: result,
    })
  }

  const effMob = effectiveMobility(trooper)
  const flk = flankingBonus(effMob)

  const armor = gearByName(trooper.armor)
  const weapon = gearByName(trooper.weapon)
  const sw = gearByName(trooper.special_weapon)
  const sg = gearByName(trooper.special_gear)

  const panelClass = isDesktop
    ? 'w-60 bg-surface border-l border-border flex flex-col overflow-y-auto shrink-0'
    : 'fixed inset-0 z-50 bg-surface overflow-y-auto flex flex-col'

  return (
    <div className={panelClass}>
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="text-ok text-[11px] tracking-wider">{trooper.name.toUpperCase()}</div>
        <button onClick={onClose} className="text-muted hover:text-ink text-[14px] leading-none">✕</button>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Suppression toggle */}
        <label className="flex items-center gap-2 text-[9px] text-muted cursor-pointer">
          <input type="checkbox" checked={trooper.suppressed}
            onChange={e => updateTrooper(trooper.id, { suppressed: e.target.checked })} />
          SUPPRESSED
        </label>

        {/* DEF modifier */}
        <Stepper label="DEF MOD" value={trooper.def_modifier}
          onChange={v => updateTrooper(trooper.id, { def_modifier: v })} min={-5} max={5} />

        {/* Gear */}
        <div className="flex flex-col gap-1 text-[9px] text-muted border-t border-border pt-2">
          <div className="lbl mb-1 text-[9px]">GEAR</div>
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
            <div className="flex items-center justify-between">
              <GearPopover gear={sw}><div>{sw.name.toUpperCase()}</div></GearPopover>
              <div className="flex items-center gap-1">
                {sw.roll_table && (
                  <button
                    onClick={() => handleRollTable(sw.name, sw.roll_table!)}
                    className="text-[9px] text-warn border border-warn px-1 py-0.5">ROLL</button>
                )}
                {sw.max_uses > 0 && (
                  <PipTracker
                    value={trooper.special_weapon_uses < 0 ? 0 : trooper.special_weapon_uses}
                    max={sw.max_uses}
                    onChange={v => updateTrooper(trooper.id, { special_weapon_uses: clampUses(v, sw.max_uses) })}
                    color={TOKEN.warn} />
                )}
              </div>
            </div>
          )}
          {sg && (
            <div className="flex items-center justify-between">
              <GearPopover gear={sg}><div>{sg.name.toUpperCase()}</div></GearPopover>
              {sg.max_uses > 0 && (
                <PipTracker
                  value={trooper.special_gear_uses < 0 ? 0 : trooper.special_gear_uses}
                  max={sg.max_uses}
                  onChange={v => updateTrooper(trooper.id, { special_gear_uses: clampUses(v, sg.max_uses) })}
                  color={TOKEN.warn} />
              )}
            </div>
          )}
        </div>

        {/* Tags + Perks */}
        {(trooper.tag || trooper.perks.length > 0) && (
          <div className="flex flex-wrap gap-1 border-t border-border pt-2">
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

        {/* MOB + FLK */}
        <div className="flex justify-between text-[10px] border-t border-border pt-2">
          <span className={effMob < trooper.mobility ? 'text-wound' : 'text-ink'}>MOB {effMob}</span>
          <span className="text-ok">FLK +{flk}</span>
        </div>
      </div>
    </div>
  )
})
export default TrooperDetailPanel

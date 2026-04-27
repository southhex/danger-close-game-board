# Compact Trooper Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce trooper card height to ~1/3 of screen by stripping secondary info to a slide-in detail panel, while keeping all primary controls interactive on the compact card.

**Architecture:** TrooperMissionCard becomes a slim card (name, status, off/def positions 2-up, grit/ammo pips, suppression dot, expand button). A new TrooperDetailPanel renders as a right-side panel (desktop) or full-screen overlay (mobile) with gear, DEF modifier, suppression toggle, tags, perks, and MOB/FLK. TrooperCardDock holds `selectedTrooperId` local state and wires expand/close.

**Tech Stack:** React 18, Tailwind CSS v3, Zustand (store accessed directly in detail panel), useMediaQuery hook already in codebase.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `src/views/MissionBoard/TrooperMissionCard.tsx` | Slim card — name, status, 2-col off/def, pips, suppression dot, expand button |
| Create | `src/views/MissionBoard/TrooperDetailPanel.tsx` | Detail panel — gear, DEF stepper, suppression toggle, tags/perks, MOB/FLK |
| Modify | `src/views/MissionBoard/TrooperCardDock.tsx` | Holds `selectedTrooperId` state; renders panel alongside card strip |

---

## Task 1: Slim down TrooperMissionCard

**Files:**
- Modify: `src/views/MissionBoard/TrooperMissionCard.tsx`

Remove: gear section, DEF modifier stepper, suppression checkbox row, tags/perks section, MOB/FLK footer.

Add: amber suppression dot in header, `onExpand` prop + `›` expand button in header.

Change: OFFENSIVE + DEFENSIVE dropdowns → side-by-side 2-column grid with shortened labels `OFF` / `DEF`.

Tighten: padding `p-2` → `p-1.5`, gap `gap-1.5` → `gap-1`.

- [ ] **Step 1: Replace TrooperMissionCard with compact version**

Full replacement of `src/views/MissionBoard/TrooperMissionCard.tsx`:

```tsx
import { memo, useMemo } from 'react'
import { Dropdown, PipTracker } from '../../components'
import { STATUS_COLOR } from '../../components/StatusBadge'
import { effectiveMobility, canSetDefpos, canSetOffpos } from '../../utils/gameRules'
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

  const effMob = effectiveMobility(trooper)
  const color = STATUS_COLOR[trooper.status]
  const dim = trooper.status === 'dead' ? 'opacity-50' : ''

  const offOpts = useMemo(() => OFFPOS.map(o => ({
    ...o,
    disabled: o.value !== trooper.offpos && !canSetOffpos(trooper, o.value, squad, space),
  })), [trooper.offpos, trooper, squad, space])

  const defOpts = useMemo(() => DEFPOS.map(o => ({
    ...o,
    disabled: o.value !== trooper.defpos && !canSetDefpos(trooper, o.value, squad, cover),
  })), [trooper.defpos, trooper, squad, cover])

  return (
    <div
      className={`bg-bg border flex-shrink-0 w-[180px] snap-start ${dim} ${expanded ? 'border-ok' : 'border-border'}`}
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="p-1.5 flex flex-col gap-1">
        {/* Header: name / callsign / suppression dot / expand */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <div className="text-ok text-[11px] tracking-wider truncate">{trooper.name.toUpperCase()}</div>
            <div className="text-[9px] text-muted shrink-0">{trooper.callsign}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Suppression indicator dot */}
            <div
              title={trooper.suppressed ? 'SUPPRESSED' : ''}
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: trooper.suppressed ? '#c8a030' : 'transparent',
                border: `1px solid ${trooper.suppressed ? '#c8a030' : '#3a4a3a'}`,
              }}
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
            onChange={v => updateTrooper(trooper.id, { grit: v })} />
          <PipTracker label="AMMO" value={trooper.ammo} max={trooper.ammo_max}
            onChange={v => updateTrooper(trooper.id, { ammo: v })} />
        </div>
      </div>
    </div>
  )
})
export default TrooperMissionCard
```

- [ ] **Step 2: Verify the app compiles**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board" && npx tsc --noEmit 2>&1 | head -40
```

Expected: type errors only for `onExpand`/`expanded` props missing at the call site in TrooperCardDock (fixed in Task 3). No other errors.

- [ ] **Step 3: Run existing tests to confirm no regression**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board" && npx vitest run 2>&1 | tail -20
```

Expected: 91 tests pass (gameRules 79, store 10, dice 2).

---

## Task 2: Create TrooperDetailPanel

**Files:**
- Create: `src/views/MissionBoard/TrooperDetailPanel.tsx`

The panel renders all the info stripped from the compact card. On desktop (`md:` and up) it is a 240px panel that sits inline to the right of the card strip. On mobile it is a `fixed inset-0 z-50` full-screen overlay. Uses `useMediaQuery` from `../../hooks/useMediaQuery`.

- [ ] **Step 1: Create TrooperDetailPanel.tsx**

```tsx
import { memo } from 'react'
import { Stepper, GearPopover, TextPopover, PipTracker, useToast } from '../../components'
import { gearByName } from '../../data/gear'
import { tagByName } from '../../data/tags'
import { effectiveMobility, flankingBonus, clampUses, lookupRollTable } from '../../utils/gameRules'
import { rollDie } from '../../utils/dice'
import { newId } from '../../utils/id'
import { useStore } from '../../store'
import { useMediaQuery } from '../../hooks/useMediaQuery'
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
                    size={8} color="#c8a030" />
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
                  size={8} color="#c8a030" />
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
```

- [ ] **Step 2: Verify the new file compiles**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board" && npx tsc --noEmit 2>&1 | head -40
```

Expected: Only remaining errors relate to TrooperCardDock not yet passing the new props. No errors inside TrooperDetailPanel itself.

---

## Task 3: Wire TrooperCardDock

**Files:**
- Modify: `src/views/MissionBoard/TrooperCardDock.tsx`

Add `selectedTrooperId: string | null` local state. Pass `onExpand` + `expanded` to each `TrooperMissionCard`. Render `TrooperDetailPanel` alongside the card strip in a flex row when a trooper is selected. Clicking the expand button on the already-selected card closes the panel (toggle).

- [ ] **Step 1: Replace TrooperCardDock with wired version**

Full replacement of `src/views/MissionBoard/TrooperCardDock.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import TrooperMissionCard from './TrooperMissionCard'
import TrooperDetailPanel from './TrooperDetailPanel'

export default function TrooperCardDock() {
  const allTroopers = useStore(s => s.troopers)
  const troopers = useMemo(() => allTroopers.filter(t => t.active), [allTroopers])
  const mission = useStore(s => s.mission)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (!mission) return null

  const activeSector = mission.sectors.find(s => s.id === mission.activeSectorId) ?? mission.sectors[0]
  const selectedTrooper = selectedId ? troopers.find(t => t.id === selectedId) ?? null : null

  const handleExpand = (id: string) => {
    setSelectedId(prev => (prev === id ? null : id))
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 z-20 pointer-events-none">
      {/* Gradient fade behind cards */}
      <div aria-hidden className="absolute -top-10 left-0 right-0 h-10"
        style={{ background: 'linear-gradient(to top, #0e1210, transparent)' }} />
      <div className="relative pointer-events-auto"
        style={{ boxShadow: '0 -4px 12px rgba(0,0,0,0.5)' }}>
        <div className="bg-surface border-t border-border">
          <div className="flex">
            {/* Card strip */}
            <div className="flex-1 min-w-0 px-3 pt-2 pb-1">
              <div className="lbl text-[9px] mb-1">TROOPERS</div>
              <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2">
                {troopers.length === 0 && (
                  <div className="text-[10px] text-muted italic">No active troopers. Activate troopers in the Barracks.</div>
                )}
                {troopers.map(t => (
                  <TrooperMissionCard
                    key={t.id}
                    trooper={t}
                    squad={troopers}
                    cover={activeSector.cover}
                    space={activeSector.space}
                    onExpand={handleExpand}
                    expanded={t.id === selectedId}
                  />
                ))}
              </div>
            </div>

            {/* Detail panel (desktop inline) */}
            {selectedTrooper && (
              <TrooperDetailPanel
                trooper={selectedTrooper}
                onClose={() => setSelectedId(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify full compile passes**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board" && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board" && npx vitest run 2>&1 | tail -20
```

Expected: 91 tests pass.

- [ ] **Step 4: Commit**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
git add src/views/MissionBoard/TrooperMissionCard.tsx \
        src/views/MissionBoard/TrooperDetailPanel.tsx \
        src/views/MissionBoard/TrooperCardDock.tsx
git commit -m "$(cat <<'EOF'
feat: compact trooper cards with slide-in detail panel

Strip secondary info (gear, DEF mod, tags, MOB/FLK) from mission cards
to reduce height ~60%. Add TrooperDetailPanel for desktop right-sidebar
and mobile full-screen overlay. Suppression shown as amber indicator dot.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Compact card: name/callsign, status, off/def 2-col, grit/ammo pips
- ✅ Suppression indicator dot (amber) in card header corner
- ✅ Expand button (`›`) in card header — toggle, not whole-card click
- ✅ All card controls remain interactive (dropdowns, pips)
- ✅ Detail panel: DEF modifier, suppression toggle, gear+uses, tags/perks, MOB/FLK
- ✅ Desktop: right-side panel inline in dock flex row
- ✅ Mobile: fixed full-screen overlay via `useMediaQuery`
- ✅ Panel close: `✕` button + expand-button toggle

**Placeholder scan:** None found. All code is complete.

**Type consistency:** `onExpand: (id: string) => void` and `expanded: boolean` defined in Task 1 Props interface and consumed in Task 3 correctly. `TrooperDetailPanel` props `trooper: Trooper` + `onClose: () => void` defined in Task 2 and passed in Task 3.

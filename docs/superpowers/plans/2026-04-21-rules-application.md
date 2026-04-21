# Rules Application — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full Rules Application feature set from smoke-testing feedback: grit/ammo max per trooper, single tag system, multi-perk system, Plasma Rifle roll table, correct SRD momentum labels with Victory/Defeat popups, and a full polyhedral dice roller.

**Architecture:** Eight sequential tasks. Tasks 1–2 lay the data foundation (types + static data); Tasks 3–6 update the UI; Tasks 7–8 add the momentum and dice features. All game logic goes in `gameRules.ts`, never in components.

**Tech Stack:** React 18, Tailwind CSS v3, Zustand 5 with persist + migrate, Vitest

---

## Brainstorm decisions captured

- **Tags:** 4 SRD tags (Forceful / Technical / Steady / Sharp), one per trooper, simple Dropdown
- **Perks:** unlimited, name + description pairs, editor list with add/remove
- **Grit/Ammo max:** stored on trooper, range 1–4 (grit) and 3–4 (ammo), steppers in editor
- **Plasma Rifle:** data-driven `roll_table` on GearItem; ROLL button on mission card
- **Momentum labels (SRD exact):** -3 DEFEAT / -2 FALTERING / -1 LOSING GROUND / 0 CONTESTED / +1 GAINING GROUND / +2 BREAKING THROUGH / +3 VICTORY
- **Victory at +3:** popup "Did the enemy break?" → BREAK (close, player handles) | HOLD (reset momentum to 0)
- **Defeat at -3:** popup with ACKNOWLEDGE + RESET MISSION option
- **Dice roller:** d3/d4/d6/d8/d10/d12/d20/d100/dx · count 0–20 · 0d = roll 2 take lowest · highest highlighted · sixes count for d6 pools only

---

## File Structure

**New files:**
- `src/data/tags.ts` — 4 SRD tags catalogue

**Modified files:**
- `src/types.ts` — Perk interface, Trooper new fields (tag/grit_max/ammo_max/perks), GearItem roll_table, remove perk: string
- `src/store/index.ts` — version bump to 1, migrate function for schema change
- `src/data/gear.ts` — add roll_table to Plasma Rifle
- `src/utils/gameRules.ts` — add lookupRollTable() pure function
- `src/components/index.ts` — add TextPopover to barrel export
- `src/components/TextPopover.tsx` — NEW generic name+description popover
- `src/views/Barracks/TrooperEditor.tsx` — tag dropdown, grit/ammo max steppers, perks list
- `src/views/Barracks/TrooperCard.tsx` — tag chip + perks chips (read existing first)
- `src/views/MissionBoard/TrooperMissionCard.tsx` — dynamic grit/ammo max, tag, perks, roll button
- `src/views/MissionBoard/SectorMomentumPanel.tsx` — SRD labels, Victory/Defeat modals
- `src/views/DiceTray/DiceControls.tsx` — full rebuild (polyhedral set + pool display)
- `tests/gameRules.test.ts` — add lookupRollTable tests

---

### Task 1: Types + Store migration

This is the foundation — do this first. Everything else depends on the updated types.

**Files:**
- Modify: `src/types.ts`
- Modify: `src/store/index.ts`

- [ ] **Step 1: Read current types.ts and store/index.ts**

Read both files in full before editing to understand existing structure.

- [ ] **Step 2: Update types.ts**

Replace the `GearItem`, `Trooper` interfaces and add `Perk`. The full new `types.ts`:

```ts
export type TrooperStatus = 'ok' | 'grazed' | 'wounded' | 'bleedingout' | 'dead'
export type OffensivePosition = 'limited' | 'engaged' | 'flanking'
export type DefensivePosition = 'flanked' | 'incover' | 'fortified'
export type GearType = 'weapon' | 'specialweapon' | 'specialequipment' | 'armor'
export type AdvanceResult = 'ambushed' | 'spotted' | 'surprise' | 'overwhelm'

export interface RollTableEntry {
  min: number
  max: number
  result: string
}

export interface GearItem {
  name: string
  geartype: GearType
  description: string
  properties: string
  mobility_cost: number
  reqcost: number
  max_uses: number
  roll_table?: {
    sides: number
    entries: RollTableEntry[]
  }
}

export interface Perk {
  name: string
  description: string
}

export interface Trooper {
  id: string
  name: string
  fullname: string
  callsign: string
  active: boolean
  perkpoints: number
  mobility: number
  armor: string
  weapon: string
  special_weapon: string
  special_gear: string
  tag: string              // '' = no tag
  perks: Perk[]           // replaces perk: string
  notes: string

  // Mission-state
  grit: number
  grit_max: number        // default 3; range 1–4
  ammo: number
  ammo_max: number        // default 3; range 3–4
  status: TrooperStatus
  offpos: OffensivePosition
  defpos: DefensivePosition
  suppressed: boolean
  def_modifier: number
  special_weapon_uses: number
  special_gear_uses: number
}

export interface MissionSector {
  name: string
  cover: 0 | 1 | 2
  space: 0 | 1 | 2
  tl: 1 | 2 | 3 | 4
  weather: -2 | -1 | 0 | 1
}

export interface MissionState {
  id: string
  name: string
  sector: MissionSector
  momentum: number
  advance_rolls: number
  stealth: boolean
  notes: string
}

export interface DiceRoll {
  id: string
  timestamp: number
  label: string
  dice: string
  results: number[]
  modifier: number
  total: number
}

export interface AppState {
  troopers: Trooper[]
  mission: MissionState | null
  diceHistory: DiceRoll[]
}

export interface ApplyAdvancePayload {
  result: AdvanceResult
  trooperOffpos?: Record<string, OffensivePosition>
}

export type View = 'barracks' | 'mission' | 'settings'
```

- [ ] **Step 3: Update store/index.ts — version bump and migrate**

Read `src/store/index.ts` in full. Then make these changes:

**a) In the `persist()` options block (find the `name: 'danger-close-app-state'` line), add `version` and `migrate`:**

```ts
{
  name: 'danger-close-app-state',
  version: 1,
  migrate: (persistedState: unknown, version: number) => {
    if (version < 1) {
      const state = persistedState as Record<string, unknown>
      if (Array.isArray(state.troopers)) {
        state.troopers = (state.troopers as Record<string, unknown>[]).map(t => ({
          ...t,
          tag: t.tag ?? '',
          grit_max: t.grit_max ?? 3,
          ammo_max: t.ammo_max ?? 3,
          perks: t.perks ?? (t.perk ? [{ name: t.perk, description: '' }] : []),
          perk: undefined,
        }))
      }
      return state
    }
    return persistedState as Record<string, unknown>
  },
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ ... }) // leave partialize unchanged
}
```

**b) Find the `EMPTY` constant or initial trooper template (look for `grit: 3` in the store file). Update the default trooper fields to include the new ones.** In `TrooperEditor.tsx` there is an EMPTY constant — also update it in step 4.

- [ ] **Step 4: Update EMPTY constant in TrooperEditor.tsx**

In `src/views/Barracks/TrooperEditor.tsx`, find and update the `EMPTY` constant:

```ts
const EMPTY: Omit<Trooper, 'id'> = {
  name: '', fullname: '', callsign: '', active: true, perkpoints: 0,
  mobility: 5, armor: 'Medium Armor', weapon: 'Assault Rifle',
  special_weapon: '', special_gear: '', tag: '', perks: [], notes: '',
  grit: 1, grit_max: 1, ammo: 3, ammo_max: 3,
  status: 'ok', offpos: 'engaged', defpos: 'incover',
  suppressed: false, def_modifier: 0, special_weapon_uses: -1, special_gear_uses: -1,
}
```

Note: `grit: 1` and `grit_max: 1` because the SRD says troopers start with 1 Grit.

- [ ] **Step 5: Run tests**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
npm test -- --run
```

TypeScript compilation errors will appear here if any component accesses the old `perk` field — fix them as they appear (rename `perk` references to `perks`).

- [ ] **Step 6: Commit**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
git add src/types.ts src/store/index.ts src/views/Barracks/TrooperEditor.tsx
git commit -m "feat: types v1 — tag, grit_max, ammo_max, perks[], roll_table; store migrate"
```

---

### Task 2: Static data — tags catalogue and Plasma Rifle roll_table

**Files:**
- Create: `src/data/tags.ts`
- Modify: `src/data/gear.ts`
- Modify: `src/utils/gameRules.ts`
- Modify: `tests/gameRules.test.ts`

- [ ] **Step 1: Create src/data/tags.ts**

```ts
export interface TagItem {
  name: string
  description: string
}

export const TAGS: TagItem[] = [
  {
    name: 'Forceful',
    description: 'Physical solutions. Kicks doors, carries wounded, holds the line through brute effort. Intimidates when talking fails.',
  },
  {
    name: 'Technical',
    description: 'Systems and logic. Hacks terminals, disarms devices, reads schematics, operates unfamiliar equipment.',
  },
  {
    name: 'Steady',
    description: 'Composure and patience. Waits out a tense situation, resists interrogation, holds position for hours, talks down a panicking civilian.',
  },
  {
    name: 'Sharp',
    description: 'Reads people and situations. Notices the detail others miss, fast-talks past a checkpoint, picks up that something is wrong before anyone else does.',
  },
]

export function tagByName(name: string): TagItem | undefined {
  return TAGS.find(t => t.name === name)
}
```

- [ ] **Step 2: Add roll_table to Plasma Rifle in gear.ts**

In `src/data/gear.ts`, find the Plasma Rifle entry and add the `roll_table` field:

```ts
{
  name: 'Plasma Rifle',
  geartype: 'specialweapon',
  description: 'Volatile.',
  properties: 'Active (no Ammo cost): Roll 1d6. 1 = +2 Injury, weapon destroyed. 2–3 = +1 Injury, +1 ATK. 4–5 = +2 ATK or 1 Hit (Hard Target). 6 = +3 ATK or 2 Hits (Hard Target).',
  mobility_cost: -1,
  reqcost: 3,
  max_uses: -1,
  roll_table: {
    sides: 6,
    entries: [
      { min: 1, max: 1, result: '+2 Injury — weapon destroyed' },
      { min: 2, max: 3, result: '+1 Injury, +1 ATK' },
      { min: 4, max: 5, result: '+2 ATK or 1 Hit (Hard Target)' },
      { min: 6, max: 6, result: '+3 ATK or 2 Hits (Hard Target)' },
    ],
  },
},
```

- [ ] **Step 3: Add lookupRollTable() to gameRules.ts**

At the bottom of `src/utils/gameRules.ts`, add:

```ts
import type { RollTableEntry } from '../types'

export function lookupRollTable(entries: RollTableEntry[], roll: number): string {
  const entry = entries.find(e => roll >= e.min && roll <= e.max)
  return entry?.result ?? '—'
}
```

- [ ] **Step 4: Write failing tests for lookupRollTable**

In `tests/gameRules.test.ts`, add a new describe block at the end:

```ts
describe('lookupRollTable', () => {
  const plasmaEntries = [
    { min: 1, max: 1, result: '+2 Injury — weapon destroyed' },
    { min: 2, max: 3, result: '+1 Injury, +1 ATK' },
    { min: 4, max: 5, result: '+2 ATK or 1 Hit (Hard Target)' },
    { min: 6, max: 6, result: '+3 ATK or 2 Hits (Hard Target)' },
  ]

  it('returns correct result for each range boundary', () => {
    expect(lookupRollTable(plasmaEntries, 1)).toBe('+2 Injury — weapon destroyed')
    expect(lookupRollTable(plasmaEntries, 2)).toBe('+1 Injury, +1 ATK')
    expect(lookupRollTable(plasmaEntries, 3)).toBe('+1 Injury, +1 ATK')
    expect(lookupRollTable(plasmaEntries, 4)).toBe('+2 ATK or 1 Hit (Hard Target)')
    expect(lookupRollTable(plasmaEntries, 5)).toBe('+2 ATK or 1 Hit (Hard Target)')
    expect(lookupRollTable(plasmaEntries, 6)).toBe('+3 ATK or 2 Hits (Hard Target)')
  })

  it('returns — for out-of-range roll', () => {
    expect(lookupRollTable(plasmaEntries, 0)).toBe('—')
    expect(lookupRollTable(plasmaEntries, 7)).toBe('—')
  })
})
```

- [ ] **Step 5: Run tests — verify lookupRollTable passes**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
npm test -- --run
```

Expected: all tests pass including new lookupRollTable tests.

- [ ] **Step 6: Commit**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
git add src/data/tags.ts src/data/gear.ts src/utils/gameRules.ts tests/gameRules.test.ts
git commit -m "feat: tags data, plasma rifle roll_table, lookupRollTable util"
```

---

### Task 3: TextPopover shared component

A generic version of GearPopover for displaying a title + description on hover/tap. Used for tags and perks on trooper cards.

**Files:**
- Create: `src/components/TextPopover.tsx`
- Modify: `src/components/index.ts`

- [ ] **Step 1: Read GearPopover.tsx**

Read `src/components/GearPopover.tsx` in full to understand the positioning and portal pattern before creating the analogous component.

- [ ] **Step 2: Create TextPopover.tsx**

```tsx
import { useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  title: string
  body: string
  children: React.ReactNode
}

export default function TextPopover({ title, body, children }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || !ref.current || !popRef.current) return
    const rect = ref.current.getBoundingClientRect()
    const pop = popRef.current
    pop.style.top = `${rect.bottom + window.scrollY + 4}px`
    pop.style.left = `${rect.left + window.scrollX}px`
  }, [open])

  return (
    <>
      <span ref={ref}
        className="cursor-pointer"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}>
        {children}
      </span>
      {open && createPortal(
        <div ref={popRef}
          className="fixed z-50 bg-surface border border-border p-2 text-[10px] max-w-[220px] shadow-lg pointer-events-none"
          style={{ position: 'absolute' }}>
          <div className="lbl text-[9px] text-ok mb-1">{title.toUpperCase()}</div>
          <div className="text-muted leading-relaxed">{body}</div>
        </div>,
        document.body
      )}
    </>
  )
}
```

- [ ] **Step 3: Add to barrel export**

In `src/components/index.ts`, add:
```ts
export { default as TextPopover } from './TextPopover'
```

- [ ] **Step 4: Run tests**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
npm test -- --run
```

Expected: all pass (no unit tests for this component — visual verification later).

- [ ] **Step 5: Commit**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
git add src/components/TextPopover.tsx src/components/index.ts
git commit -m "feat: TextPopover component for tag and perk popups"
```

---

### Task 4: TrooperEditor — tag, grit/ammo max, perks list

**Files:**
- Modify: `src/views/Barracks/TrooperEditor.tsx`

- [ ] **Step 1: Read TrooperEditor.tsx in full**

Read `src/views/Barracks/TrooperEditor.tsx` to understand the current form structure before editing.

- [ ] **Step 2: Add tag dropdown**

At the top of TrooperEditor.tsx, import tags data:
```ts
import { TAGS } from '../../data/tags'
```

Build tag options (add this constant near the top of the file):
```ts
const TAG_OPTIONS = [
  { value: '', label: '— No Tag —' },
  ...TAGS.map(t => ({ value: t.name, label: t.name })),
]
```

In the form JSX, add the tag dropdown after the CALLSIGN field and before the ACTIVE checkbox:
```tsx
<Dropdown className="col-span-2" label="TAG" value={form.tag}
  options={TAG_OPTIONS} onChange={v => set('tag', v)} />
{form.tag && (
  <div className="col-span-2 text-[10px] text-muted -mt-1">
    {TAGS.find(t => t.name === form.tag)?.description}
  </div>
)}
```

- [ ] **Step 3: Add grit_max and ammo_max steppers**

Import Stepper (it's in the barrel export already):
```ts
import { Modal, ConfirmDialog, Dropdown, Stepper } from '../../components'
```

In the form JSX, after the COMPUTED MOBILITY row, add:
```tsx
<div className="col-span-1 flex items-center justify-between">
  <Stepper label="GRIT MAX" value={form.grit_max}
    onChange={v => set('grit_max', v)} min={1} max={4} />
</div>
<div className="col-span-1 flex items-center justify-between">
  <Stepper label="AMMO MAX" value={form.ammo_max}
    onChange={v => set('ammo_max', v)} min={3} max={4} />
</div>
```

- [ ] **Step 4: Replace perk field with perks list**

Remove the existing PERK input field. Add a perks list section after the AMMO MAX row:

```tsx
<div className="col-span-2 border-t border-border pt-2 mt-1">
  <div className="flex items-center justify-between mb-2">
    <div className="lbl text-[10px]">PERKS</div>
    <button
      type="button"
      onClick={() => set('perks', [...form.perks, { name: '', description: '' }])}
      className="text-[10px] text-ok border border-ok px-2 py-0.5">+ ADD</button>
  </div>
  {form.perks.length === 0 && (
    <div className="text-[10px] text-muted italic">No perks.</div>
  )}
  {form.perks.map((perk, i) => (
    <div key={i} className="flex flex-col gap-1 mb-2 border border-border p-2">
      <div className="flex items-center gap-1">
        <input
          placeholder="Perk name"
          className="flex-1 bg-bg border border-border text-ink text-xs px-2 py-0.5 font-mono"
          value={perk.name}
          onChange={e => {
            const updated = form.perks.map((p, j) => j === i ? { ...p, name: e.target.value } : p)
            set('perks', updated)
          }} />
        <button
          type="button"
          onClick={() => set('perks', form.perks.filter((_, j) => j !== i))}
          className="text-[10px] text-bad border border-bad px-2 py-0.5">×</button>
      </div>
      <textarea
        rows={2}
        placeholder="Description"
        className="w-full bg-bg border border-border text-ink text-xs px-2 py-1 font-mono"
        value={perk.description}
        onChange={e => {
          const updated = form.perks.map((p, j) => j === i ? { ...p, description: e.target.value } : p)
          set('perks', updated)
        }} />
    </div>
  ))}
</div>
```

- [ ] **Step 5: Remove perk from save logic**

In the `save()` function, ensure `perk` is not referenced. The payload spreads `form` which no longer has `perk`. Verify no references remain.

- [ ] **Step 6: Run tests**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
npm test -- --run
```

Fix any TypeScript errors (e.g., remaining `form.perk` references).

- [ ] **Step 7: Commit**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
git add src/views/Barracks/TrooperEditor.tsx
git commit -m "feat: TrooperEditor — tag dropdown, grit/ammo max steppers, multi-perk list"
```

---

### Task 5: TrooperCard (Barracks) — tag + perks display

**Files:**
- Modify: `src/views/Barracks/TrooperCard.tsx`

- [ ] **Step 1: Read TrooperCard.tsx in full**

Read `src/views/Barracks/TrooperCard.tsx` before editing.

- [ ] **Step 2: Add tag and perks display**

Import TextPopover:
```ts
import { TextPopover } from '../../components'
```

Import tagByName:
```ts
import { tagByName } from '../../data/tags'
```

In the JSX (after the trooper name / existing fields), add a small section showing the tag and perks. The exact placement depends on the current card layout — aim for the bottom of the permanent info section:

```tsx
{/* Tag */}
{trooper.tag && (() => {
  const tagData = tagByName(trooper.tag)
  return tagData ? (
    <TextPopover title={tagData.name} body={tagData.description}>
      <span className="text-[9px] border border-border px-1 text-muted uppercase tracking-wider">
        {trooper.tag}
      </span>
    </TextPopover>
  ) : null
})()}

{/* Perks */}
{trooper.perks.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-0.5">
    {trooper.perks.map((perk, i) => (
      <TextPopover key={i} title={perk.name} body={perk.description || 'No description.'}>
        <span className="text-[9px] border border-border px-1 text-muted uppercase tracking-wider cursor-pointer">
          {perk.name}
        </span>
      </TextPopover>
    ))}
  </div>
)}
```

- [ ] **Step 3: Run tests + dev server**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
npm test -- --run && npm run dev
```

Verify in browser: Barracks card shows tag chip and perk chips with popover on hover.

- [ ] **Step 4: Commit**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
git add src/views/Barracks/TrooperCard.tsx
git commit -m "feat: TrooperCard shows tag chip and perk chips with popover"
```

---

### Task 6: TrooperMissionCard — dynamic max, tag, perks, roll table button

**Files:**
- Modify: `src/views/MissionBoard/TrooperMissionCard.tsx`

- [ ] **Step 1: Read TrooperMissionCard.tsx in full**

Read `src/views/MissionBoard/TrooperMissionCard.tsx` before editing.

- [ ] **Step 2: Update PipTracker max values**

Find the two PipTracker calls for GRIT and AMMO. Change `max={3}` to use the trooper's stored maxes:

```tsx
<PipTracker label="GRIT" value={trooper.grit} max={trooper.grit_max}
  onChange={v => updateTrooper(trooper.id, { grit: v })} />
<PipTracker label="AMMO" value={trooper.ammo} max={trooper.ammo_max}
  onChange={v => updateTrooper(trooper.id, { ammo: v })} />
```

- [ ] **Step 3: Add roll_table state and handler**

Add at the top of the component (inside the function body):

```tsx
import { useState } from 'react'
import { rollDie } from '../../utils/dice'
import { lookupRollTable } from '../../utils/gameRules'
import { newId } from '../../utils/id'
import { TextPopover } from '../../components'
import { tagByName } from '../../data/tags'

// Inside component:
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
```

Note: `addRoll` may already be imported if the component uses it — check and avoid duplicate import.

- [ ] **Step 4: Update gear listing to show roll button and result**

Find the section that renders `sw` (special weapon). Update it to show the ROLL button when `roll_table` exists:

```tsx
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
```

Apply the same pattern for `sg` (special gear) if it could also have a roll table (defensive: yes, keep consistent).

- [ ] **Step 5: Add tag and perks display**

In the gear section at the bottom of the card, add tag and perks chips:

```tsx
{trooper.tag && (() => {
  const tagData = tagByName(trooper.tag)
  return tagData ? (
    <TextPopover title={tagData.name} body={tagData.description}>
      <span className="text-[9px] border border-border px-1 text-muted uppercase tracking-wider cursor-pointer">
        {trooper.tag}
      </span>
    </TextPopover>
  ) : null
})()}
{trooper.perks.map((perk, i) => (
  <TextPopover key={i} title={perk.name} body={perk.description || 'No description.'}>
    <span className="text-[9px] border border-border px-1 text-muted uppercase tracking-wider cursor-pointer">
      {perk.name}
    </span>
  </TextPopover>
))}
```

- [ ] **Step 6: Run tests + dev server**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
npm test -- --run && npm run dev
```

Verify: Mission card grit/ammo pips respect trooper's stored max. Plasma Rifle ROLL button appears on the card. Tag and perk chips show with popover.

- [ ] **Step 7: Commit**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
git add src/views/MissionBoard/TrooperMissionCard.tsx
git commit -m "feat: mission card — dynamic grit/ammo max, tag/perks, roll_table button"
```

---

### Task 7: SectorMomentumPanel — SRD labels + Victory/Defeat popups

**Files:**
- Modify: `src/views/MissionBoard/SectorMomentumPanel.tsx`

- [ ] **Step 1: Read SectorMomentumPanel.tsx in full**

Read `src/views/MissionBoard/SectorMomentumPanel.tsx` before editing.

- [ ] **Step 2: Replace momentum labels with SRD terms**

Find and replace the `MOMENTUM_LABEL` constant:

```ts
const MOMENTUM_LABEL: Record<string, string> = {
  '-3': 'DEFEAT',
  '-2': 'FALTERING',
  '-1': 'LOSING GROUND',
  '0': 'CONTESTED',
  '1': 'GAINING GROUND',
  '2': 'BREAKING THROUGH',
  '3': 'VICTORY',
}
```

- [ ] **Step 3: Add Victory/Defeat popup state and logic**

Import Modal and resetMission:
```ts
import { Modal } from '../../components'
```

In the component, add:
```tsx
const resetMission = useStore(s => s.resetMission)    // may need to confirm action name in store
const [victoryOpen, setVictoryOpen] = useState(false)
const [defeatOpen, setDefeatOpen] = useState(false)
```

Add at top of component function body:
```ts
import { useState } from 'react'
```

Replace the momentum increment button's `onClick` handler:

```tsx
// Decrement button (◀):
onClick={() => {
  const next = mission.momentum - 1
  if (next < -3) {
    setDefeatOpen(true)
  } else {
    setMission({ momentum: clampMomentum(next) })
  }
}}

// Increment button (▶):
onClick={() => {
  const next = mission.momentum + 1
  if (next > 3) {
    setVictoryOpen(true)
  } else {
    setMission({ momentum: clampMomentum(next) })
  }
}}
```

Note: since momentum is already clamped at ±3, the popup fires when the user tries to push beyond the cap.

- [ ] **Step 4: Add Victory and Defeat Modal JSX**

At the bottom of the component's returned JSX (before the final closing tag):

```tsx
{/* Victory popup */}
<Modal open={victoryOpen} onClose={() => setVictoryOpen(false)} title="VICTORY">
  <p className="text-[11px] text-muted mb-4">
    THE ENEMY IS BREAKING THROUGH — Did the enemy break completely?
  </p>
  <div className="flex gap-2 justify-end">
    <button
      onClick={() => {
        setMission({ momentum: 0 })
        setVictoryOpen(false)
      }}
      className="text-[11px] text-muted border border-border px-3 py-1">
      THEY HOLD — RESET MOMENTUM
    </button>
    <button
      onClick={() => setVictoryOpen(false)}
      className="text-[11px] text-ok border border-ok px-3 py-1">
      ENEMY BREAKS
    </button>
  </div>
</Modal>

{/* Defeat popup */}
<Modal open={defeatOpen} onClose={() => setDefeatOpen(false)} title="DEFEAT">
  <p className="text-[11px] text-muted mb-4">
    THE SQUAD IS ROUTED — Forced to fall back.
  </p>
  <div className="flex gap-2 justify-end">
    <button
      onClick={() => setDefeatOpen(false)}
      className="text-[11px] text-muted border border-border px-3 py-1">
      ACKNOWLEDGE
    </button>
    <button
      onClick={() => {
        resetMission()
        setDefeatOpen(false)
      }}
      className="text-[11px] text-bad border border-bad px-3 py-1">
      RESET MISSION
    </button>
  </div>
</Modal>
```

- [ ] **Step 5: Confirm resetMission action name**

In `src/store/index.ts`, search for the reset mission action name. It may be `resetMission`, `clearMission`, or something similar. Use the exact name from the store.

- [ ] **Step 6: Run tests + dev server**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
npm test -- --run && npm run dev
```

Verify: Momentum labels show SRD terms. Pressing ▶ at +3 shows Victory popup. Pressing ◀ at -3 shows Defeat popup. THEY HOLD resets to 0. RESET MISSION clears the mission.

- [ ] **Step 7: Commit**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
git add src/views/MissionBoard/SectorMomentumPanel.tsx
git commit -m "feat: SRD momentum labels, Victory/Defeat popups at ±3"
```

---

### Task 8: DiceControls — full polyhedral rebuild

**Files:**
- Modify: `src/views/DiceTray/DiceControls.tsx`

- [ ] **Step 1: Read current DiceControls.tsx**

Read `src/views/DiceTray/DiceControls.tsx` in full.

- [ ] **Step 2: Rewrite DiceControls.tsx**

Replace the entire file contents:

```tsx
import { useState } from 'react'
import { useStore } from '../../store'
import { rollDice } from '../../utils/dice'
import { newId } from '../../utils/id'

const DIE_TYPES = ['d3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', 'dx'] as const
type DieType = typeof DIE_TYPES[number]

function getSides(dieType: DieType, customSides: number): number {
  if (dieType === 'dx') return Math.max(2, customSides)
  if (dieType === 'd3') return 3
  return parseInt(dieType.slice(1))
}

export default function DiceControls() {
  const addRoll = useStore(s => s.addRoll)
  const [dieType, setDieType] = useState<DieType>('d6')
  const [count, setCount] = useState(2)
  const [customSides, setCustomSides] = useState(6)
  const [modifier, setModifier] = useState(0)
  const [label, setLabel] = useState('')
  const [lastRoll, setLastRoll] = useState<{
    results: number[]
    sides: number
    total: number
    isZero: boolean
  } | null>(null)

  const sides = getSides(dieType, customSides)
  const isD6Pool = dieType === 'd6' && count >= 2

  const doRoll = () => {
    const isZero = count === 0
    const rollCount = isZero ? 2 : count
    const results = rollDice(rollCount, sides)
    const total = isZero
      ? Math.min(...results)
      : results.reduce((a, b) => a + b, 0) + modifier

    setLastRoll({ results, sides, total, isZero })
    addRoll({
      id: newId(),
      timestamp: Date.now(),
      label: label || `${count}${dieType}`,
      dice: `${count}${dieType}`,
      results,
      modifier: isZero ? 0 : modifier,
      total,
    })
  }

  const highVal = lastRoll ? (lastRoll.isZero ? Math.min(...lastRoll.results) : Math.max(...lastRoll.results)) : null

  return (
    <div className="flex flex-col gap-3">
      {/* Die type selector */}
      <div className="flex flex-wrap gap-1">
        {DIE_TYPES.map(d => (
          <button key={d} onClick={() => setDieType(d)}
            className={`text-[10px] border px-2 py-0.5 ${dieType === d ? 'border-warn text-warn' : 'border-border text-muted hover:text-ink'}`}>
            {d.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Custom sides input */}
      {dieType === 'dx' && (
        <div className="flex items-center gap-2">
          <span className="lbl text-[10px]">SIDES</span>
          <input type="number" min={2} max={999}
            className="w-16 bg-bg border border-border text-ink text-xs px-2 py-0.5 font-mono"
            value={customSides}
            onChange={e => setCustomSides(Math.max(2, parseInt(e.target.value) || 2))} />
        </div>
      )}

      {/* Count + modifier row */}
      <div className="flex gap-2 items-center flex-wrap">
        <span className="lbl text-[10px]">COUNT</span>
        <button onClick={() => setCount(c => Math.max(0, c - 1))} className="text-muted text-base leading-none">−</button>
        <div className="bg-bg border border-border px-2 py-0.5 text-xs min-w-[28px] text-center">{count}</div>
        <button onClick={() => setCount(c => Math.min(20, c + 1))} className="text-muted text-base leading-none">+</button>

        <span className="lbl text-[10px] ml-2">MOD</span>
        <button onClick={() => setModifier(m => Math.max(-5, m - 1))} className="text-muted text-base leading-none">−</button>
        <div className="bg-bg border border-border px-2 py-0.5 text-xs min-w-[32px] text-center">
          {modifier >= 0 ? `+${modifier}` : modifier}
        </div>
        <button onClick={() => setModifier(m => Math.min(5, m + 1))} className="text-muted text-base leading-none">+</button>
      </div>

      {/* Label + roll button */}
      <div className="flex gap-2">
        <input placeholder="label (optional)"
          className="flex-1 bg-bg border border-border text-ink text-xs px-2 py-0.5 font-mono"
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doRoll()} />
        <button onClick={doRoll}
          className="text-[11px] text-warn border border-warn px-3 py-1">ROLL</button>
      </div>

      {/* 0d hint */}
      {count === 0 && (
        <div className="text-[9px] text-muted italic">0d mode: rolling 2, taking lowest</div>
      )}

      {/* Results */}
      {lastRoll && (
        <div className="bg-bg border border-border p-2 flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1">
            {lastRoll.results.map((r, i) => {
              const highlight = r === highVal
              return (
                <div key={i}
                  className={`text-xs min-w-[26px] text-center border px-1.5 py-0.5 ${highlight ? 'border-warn text-warn' : 'border-border text-muted'}`}>
                  {r}
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 text-[10px]">
            <span className="text-muted">
              {lastRoll.isZero ? 'LOW' : 'HIGH'}:{' '}
              <span className="text-warn">{highVal}</span>
            </span>
            <span className="text-muted">
              TOTAL: <span className="text-ink">{lastRoll.total}</span>
            </span>
            {isD6Pool && (
              <span className="text-muted">
                SIXES: <span className="text-warn">{lastRoll.results.filter(r => r === 6).length}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run tests + dev server**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
npm test -- --run && npm run dev
```

Open the Dice Tray (⬡ button). Verify:
1. All 9 die types selectable
2. dx shows sides input
3. Count 0 shows 0d hint, rolls 2 dice and highlights lowest
4. Count ≥2 d6 shows SIXES stat
5. Highest result highlighted in amber
6. Enter key rolls
7. Rolls appear in history

- [ ] **Step 4: Commit**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
git add src/views/DiceTray/DiceControls.tsx
git commit -m "feat: dice roller — full polyhedral set, pool display, 0d mode, sixes count"
```

---

## Post-implementation: update CLAUDE.md

After all tasks pass, update `CLAUDE.md` to reflect:
- `Trooper.perk: string` → `Trooper.perks: Perk[]` + `Trooper.tag: string` + `Trooper.grit_max/ammo_max`
- Clamping rule: `Grit/Ammo 0–grit_max/ammo_max` (not hardcoded 3)
- `src/data/tags.ts` added to project structure
- Store version is now 1 (has migrate function)

---

## Verification checklist

- [ ] `npm test -- --run` passes (target: ≥46 tests after new gameRules tests)
- [ ] TypeScript: `npm run build` passes with no errors
- [ ] Barracks: create a new trooper — tag dropdown shows 4 options, grit max stepper works, can add/remove perks
- [ ] Barracks trooper card: tag chip and perk chips show with popover on hover
- [ ] Mission card: grit/ammo pips respect `grit_max`/`ammo_max`; Plasma Rifle shows ROLL button; result appears inline
- [ ] Momentum panel: labels are SRD terms; Victory popup at +3; Defeat popup at -3; HOLD resets to 0; RESET MISSION clears mission
- [ ] Dice tray: all 9 die types work; 0d rolls 2 take lowest; highest highlighted; sixes shown for d6 pools ≥2
- [ ] Existing save data: export JSON, reload — old `perk` field migrated to `perks[0]`, no data loss

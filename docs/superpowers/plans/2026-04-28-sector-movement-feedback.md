# Sector Movement Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make moving between sectors feel like a beat, not a state assignment, by adding three feedback layers — a persistent SectorHeader above every phase panel, an AdvancePreview that previews the carries/resets diff before commit, and a SectorEnteredBanner that announces the new sector's parameters after advancing.

**Architecture:** Three new presentational components and one new piece of mission state (`transitionFromSectorId`). Store gains an action to clear the transition flag; `advanceToNextSector` sets it. No changes to engagement logic, advance roll math, or sector status semantics — that's a separate plan covering the structural problems (OVERWHELM clearing, victory marks sectors cleared, mission-complete state). This plan is feedback-only.

**Tech Stack:** React 18, Tailwind v3, Zustand, Vitest.

**Out of scope:** Chip-strip click feedback (deferred), structural sector-progression bugs (separate plan), sector reordering, mission-complete state.

---

### Task 1: weatherLabel helper

Pure formatting helper, used by SectorHeader and AdvancePreview to render weather as a readable string instead of a bare integer.

**Files:**
- Modify: `src/utils/gameRules.ts`
- Modify: `tests/gameRules.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/gameRules.test.ts`:

```ts
import { weatherLabel } from '../src/utils/gameRules'

describe('weatherLabel', () => {
  it('formats each weather value', () => {
    expect(weatherLabel(-2)).toBe('EXTREME')
    expect(weatherLabel(-1)).toBe('HARSH')
    expect(weatherLabel(0)).toBe('CLEAR')
    expect(weatherLabel(1)).toBe('FAVORABLE')
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

```
npx vitest run tests/gameRules.test.ts -t weatherLabel
```
Expected: FAIL — `weatherLabel is not a function`.

- [ ] **Step 3: Implement weatherLabel**

Append to `src/utils/gameRules.ts`:

```ts
export function weatherLabel(weather: -2 | -1 | 0 | 1): string {
  if (weather === -2) return 'EXTREME'
  if (weather === -1) return 'HARSH'
  if (weather === 0)  return 'CLEAR'
  return 'FAVORABLE'
}
```

- [ ] **Step 4: Run test, verify it passes**

```
npx vitest run tests/gameRules.test.ts -t weatherLabel
```
Expected: PASS.

- [ ] **Step 5: Commit**

```
git add src/utils/gameRules.ts tests/gameRules.test.ts
git commit -m "feat: add weatherLabel helper for sector display"
```

---

### Task 2: SectorHeader component

Persistent compact header `SECTOR ALPHA · C1/S2/TL3 · CLEAR · ACTIVE` rendered at the top of every phase panel. Replaces the ad-hoc `sectorNotation` line currently in EngagementPanel.

**Files:**
- Create: `src/views/MissionBoard/SectorHeader.tsx`
- Modify: `src/views/MissionBoard/AdvanceRollPanel.tsx`
- Modify: `src/views/MissionBoard/EngagementPanel.tsx`
- Modify: `src/views/MissionBoard/CatchBreathPanel.tsx`

- [ ] **Step 1: Create SectorHeader**

Create `src/views/MissionBoard/SectorHeader.tsx`:

```tsx
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
```

- [ ] **Step 2: Wire into AdvanceRollPanel**

In `src/views/MissionBoard/AdvanceRollPanel.tsx`, add to imports near the other local imports:

```tsx
import SectorHeader from './SectorHeader'
```

Replace the existing top `<div>` of the returned JSX (the `bg-surface border border-border p-3` wrapper at line 91) so it begins with the SectorHeader. Specifically, locate:

```tsx
  return (
    <div className="bg-surface border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="lbl">ADVANCE ROLL</div>
```

Insert the header as the first child:

```tsx
  return (
    <div className="bg-surface border border-border p-3">
      <SectorHeader sector={activeSector} />
      <div className="flex items-center justify-between mb-2">
        <div className="lbl">ADVANCE ROLL</div>
```

- [ ] **Step 3: Wire into EngagementPanel, replace existing notation line**

In `src/views/MissionBoard/EngagementPanel.tsx`:

Add import:
```tsx
import SectorHeader from './SectorHeader'
```

Find the line at approximately line 71:
```tsx
          <div className="text-[10px] text-muted">{sectorNotation(activeSector)}</div>
```

Replace it with:
```tsx
          <SectorHeader sector={activeSector} />
```

Remove the now-unused `sectorNotation` import on line 2 if no other reference remains (run `grep sectorNotation src/views/MissionBoard/EngagementPanel.tsx` to check).

- [ ] **Step 4: Wire into CatchBreathPanel**

In `src/views/MissionBoard/CatchBreathPanel.tsx`:

Add import:
```tsx
import SectorHeader from './SectorHeader'
```

Find the active sector by reusing the `currentIdx` variable already in the file (line 15). Just before that line, add:

```tsx
const activeSector = mission ? mission.sectors.find(s => s.id === mission.activeSectorId) : null
```

Then in the returned JSX, locate the outermost wrapper:
```tsx
    <div className="flex flex-col gap-4 p-3 text-[11px] font-mono">

      {/* ── Header ── */}
      <div>
        <div className="lbl text-[10px] mb-1">CATCH BREATH</div>
```

Insert the SectorHeader as the first child of the wrapper:

```tsx
    <div className="flex flex-col gap-4 p-3 text-[11px] font-mono">
      {activeSector && <SectorHeader sector={activeSector} />}

      {/* ── Header ── */}
      <div>
        <div className="lbl text-[10px] mb-1">CATCH BREATH</div>
```

- [ ] **Step 5: Run typecheck and tests**

```
npx tsc --noEmit
npx vitest run
```
Expected: typecheck clean, all tests pass.

- [ ] **Step 6: Commit**

```
git add src/views/MissionBoard/SectorHeader.tsx src/views/MissionBoard/AdvanceRollPanel.tsx src/views/MissionBoard/EngagementPanel.tsx src/views/MissionBoard/CatchBreathPanel.tsx
git commit -m "feat: add persistent SectorHeader to all phase panels"
```

---

### Task 3: transitionFromSectorId state

Track which sector the squad just left. Set by `advanceToNextSector`, cleared by a new `clearTransition` action. Persisted across reloads via store v3 migration.

**Files:**
- Modify: `src/types.ts`
- Modify: `src/store/index.ts`
- Modify: `tests/store.test.ts`

- [ ] **Step 1: Add field to MissionState**

In `src/types.ts`, locate `MissionState` and append `transitionFromSectorId`:

```ts
export interface MissionState {
  id: string
  name: string
  sectors: MissionSector[]
  activeSectorId: string
  phase: 'advance' | 'engagement' | 'catch_breath'
  engagement: EngagementState | null
  momentum: number
  advance_rolls: number
  stealth: boolean
  notes: string
  transitionFromSectorId: string | null
}
```

- [ ] **Step 2: Update DEFAULT_MISSION and store action**

In `src/store/index.ts`, locate `DEFAULT_MISSION` (line 74) and add the field:

```ts
const DEFAULT_MISSION: MissionState = {
  id: 'current',
  name: 'Current Mission',
  sectors: [{ id: 'sector-1', name: 'Sector Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }],
  activeSectorId: 'sector-1',
  phase: 'advance' as const,
  engagement: null,
  momentum: 0,
  advance_rolls: 0,
  stealth: false,
  notes: '',
  transitionFromSectorId: null,
}
```

In the `Store` interface (line 16), add the new action signature near the other sector actions:

```ts
  clearTransition: () => void
```

In `advanceToNextSector` (line 482), capture the leaving sector id and include it in the returned mission state. Replace the existing implementation with:

```ts
      advanceToNextSector: () => set((s) => {
        if (!s.mission) return s
        const sectors = s.mission.sectors
        const currentIdx = sectors.findIndex(sec => sec.id === s.mission!.activeSectorId)
        const fromSectorId = s.mission.activeSectorId
        const nextSector = sectors.slice(currentIdx + 1).find(sec => sec.status === 'pending')
        if (!nextSector) return s

        const newSectors = sectors.map(sec => {
          if (sec.id === fromSectorId) return { ...sec, status: 'cleared' as const }
          if (sec.id === nextSector.id) return { ...sec, status: 'active' as const }
          return sec
        })

        const nextTroopers = s.troopers.map(t => {
          if (!t.active) return t
          const jumpPackMax = t.special_gear === 'Jump Pack' ? maxUsesFor('Jump Pack') : t.special_gear_uses
          return {
            ...t,
            suppressed: false,
            def_modifier: 0,
            special_gear_uses: jumpPackMax,
          }
        })

        return {
          troopers: nextTroopers,
          mission: {
            ...s.mission,
            sectors: newSectors,
            activeSectorId: nextSector.id,
            advance_rolls: 0,
            phase: 'advance' as const,
            engagement: null,
            transitionFromSectorId: fromSectorId,
          },
        }
      }),
```

Add the `clearTransition` action immediately below `advanceToNextSector`:

```ts
      clearTransition: () => set((s) => {
        if (!s.mission) return s
        return { mission: { ...s.mission, transitionFromSectorId: null } }
      }),
```

- [ ] **Step 3: Bump persist version and migrate**

In the persist config (around line 653), bump version and add v3 migration. Replace the `migrate` function with:

```ts
      version: 3,
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
        }
        if (version < 2) {
          const state = persistedState as Record<string, unknown>
          if (state.mission && typeof state.mission === 'object') {
            const m = state.mission as Record<string, unknown>
            if (m.sector && !m.sectors) {
              const oldSector = m.sector as Record<string, unknown>
              m.sectors = [{ id: 'sector-1', ...oldSector, status: 'active' }]
              m.activeSectorId = 'sector-1'
              delete m.sector
            } else if (!m.sectors) {
              m.sectors = [{ id: 'sector-1', name: 'Sector Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }]
              m.activeSectorId = 'sector-1'
            }
            m.phase = m.phase ?? 'advance'
            m.engagement = m.engagement ?? null
          }
        }
        if (version < 3) {
          const state = persistedState as Record<string, unknown>
          if (state.mission && typeof state.mission === 'object') {
            const m = state.mission as Record<string, unknown>
            if (m.transitionFromSectorId === undefined) {
              m.transitionFromSectorId = null
            }
          }
        }
        return persistedState as Record<string, unknown>
      },
```

- [ ] **Step 4: Write store tests**

Append to `tests/store.test.ts` inside an appropriate `describe` block (or a new one):

```ts
describe('sector transition state', () => {
  beforeEach(() => { resetStore() })

  it('advanceToNextSector sets transitionFromSectorId to the leaving sector', () => {
    useStore.setState({
      troopers: [makeTrooper({ id: 't1', mobility: 4 })],
      mission: {
        id: 'm', name: 'M',
        sectors: [
          { id: 'a', name: 'A', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' },
          { id: 'b', name: 'B', cover: 1, space: 1, tl: 2, weather: 0, status: 'pending' },
        ],
        activeSectorId: 'a',
        phase: 'catch_breath', engagement: null,
        momentum: 0, advance_rolls: 0, stealth: false, notes: '',
        transitionFromSectorId: null,
      },
    })

    useStore.getState().advanceToNextSector()

    const m = useStore.getState().mission!
    expect(m.activeSectorId).toBe('b')
    expect(m.transitionFromSectorId).toBe('a')
    expect(m.sectors.find(s => s.id === 'a')!.status).toBe('cleared')
  })

  it('clearTransition resets the flag', () => {
    useStore.setState({
      mission: {
        id: 'm', name: 'M',
        sectors: [{ id: 'a', name: 'A', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }],
        activeSectorId: 'a',
        phase: 'advance', engagement: null,
        momentum: 0, advance_rolls: 0, stealth: false, notes: '',
        transitionFromSectorId: 'previous',
      },
    })

    useStore.getState().clearTransition()
    expect(useStore.getState().mission!.transitionFromSectorId).toBeNull()
  })
})
```

- [ ] **Step 5: Run tests**

```
npx tsc --noEmit
npx vitest run
```
Expected: typecheck clean, all tests pass (including the two new ones).

- [ ] **Step 6: Commit**

```
git add src/types.ts src/store/index.ts tests/store.test.ts
git commit -m "feat: track sector transition origin in mission state"
```

---

### Task 4: AdvancePreview component

Replace the bare "ADVANCE TO NEXT SECTOR" button in CatchBreathPanel with a panel that previews the next sector's parameters and lists what carries vs what resets. One click still commits the advance.

**Files:**
- Create: `src/views/MissionBoard/AdvancePreview.tsx`
- Modify: `src/views/MissionBoard/CatchBreathPanel.tsx`

- [ ] **Step 1: Create AdvancePreview**

Create `src/views/MissionBoard/AdvancePreview.tsx`:

```tsx
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
  const coverLine  = diff(fromSector.cover, toSector.cover, v => `C${v}`)
  const spaceLine  = diff(fromSector.space, toSector.space, v => `S${v}`)
  const tlLine     = diff(fromSector.tl, toSector.tl, v => `TL${v}`)
  const weatherLine = diff(fromSector.weather, toSector.weather, v => weatherLabel(v as -2 | -1 | 0 | 1))

  const stealthCarry = mission.stealth ? 'STEALTH ACTIVE' : null
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
```

- [ ] **Step 2: Wire into CatchBreathPanel**

In `src/views/MissionBoard/CatchBreathPanel.tsx`:

Add import:
```tsx
import AdvancePreview from './AdvancePreview'
```

Locate the "ADVANCE" section (approximately lines 222-246):

```tsx
      {/* ── Section 7: Advance ── */}
      <div>
        <div className="lbl text-[10px] mb-1">ADVANCE</div>
        {nextSector ? (
          <button
            onClick={advanceToNextSector}
            className="w-full px-3 py-2 border border-ok text-ok text-[10px] text-left"
          >
            ADVANCE TO NEXT SECTOR ({nextSector.name}) →
          </button>
        ) : (
          <>
            <button
              onClick={() => setAddSectorOpen(true)}
              className="w-full px-3 py-2 border border-warn text-warn text-[10px] text-left"
            >
              ADD NEXT SECTOR
            </button>
            <SectorEditorModal
              open={addSectorOpen}
              onClose={() => setAddSectorOpen(false)}
            />
          </>
        )}
      </div>
```

Replace the `nextSector ? (...)` branch so it uses AdvancePreview. The full replacement:

```tsx
      {/* ── Section 7: Advance ── */}
      <div>
        <div className="lbl text-[10px] mb-1">ADVANCE</div>
        {nextSector && activeSector ? (
          <AdvancePreview
            fromSector={activeSector}
            toSector={nextSector}
            mission={mission}
            onConfirm={advanceToNextSector}
          />
        ) : (
          <>
            <button
              onClick={() => setAddSectorOpen(true)}
              className="w-full px-3 py-2 border border-warn text-warn text-[10px] text-left"
            >
              ADD NEXT SECTOR
            </button>
            <SectorEditorModal
              open={addSectorOpen}
              onClose={() => setAddSectorOpen(false)}
            />
          </>
        )}
      </div>
```

(The `activeSector` variable was added in Task 2 Step 4. Confirm it's still in scope — if Task 2 was skipped, add `const activeSector = mission.sectors.find(s => s.id === mission.activeSectorId)` near the existing `currentIdx` line.)

- [ ] **Step 3: Run typecheck and tests**

```
npx tsc --noEmit
npx vitest run
```
Expected: typecheck clean, all tests pass.

- [ ] **Step 4: Commit**

```
git add src/views/MissionBoard/AdvancePreview.tsx src/views/MissionBoard/CatchBreathPanel.tsx
git commit -m "feat: AdvancePreview replaces bare advance button with carries/resets diff"
```

---

### Task 5: SectorEnteredBanner

Render at the top of AdvanceRollPanel when `mission.transitionFromSectorId` is set. Shows a from→to delta highlighting changed parameters. Auto-clears when the user starts an advance roll, or via an explicit DISMISS.

**Files:**
- Create: `src/views/MissionBoard/SectorEnteredBanner.tsx`
- Modify: `src/views/MissionBoard/AdvanceRollPanel.tsx`

- [ ] **Step 1: Create SectorEnteredBanner**

Create `src/views/MissionBoard/SectorEnteredBanner.tsx`:

```tsx
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
```

- [ ] **Step 2: Wire into AdvanceRollPanel**

In `src/views/MissionBoard/AdvanceRollPanel.tsx`:

Add import:
```tsx
import SectorEnteredBanner from './SectorEnteredBanner'
```

Add the `clearTransition` action to the existing `useStore` selector list near the top of the component:

```tsx
  const clearTransition = useStore(s => s.clearTransition)
```

Compute the from-sector and dismiss handler. Insert just below the existing `activeSector` calculation (line 35):

```tsx
  const fromSector = mission.transitionFromSectorId
    ? mission.sectors.find(s => s.id === mission.transitionFromSectorId) ?? null
    : null
  const showBanner = fromSector !== null && phase.kind === 'setup'
```

Modify the `roll` function to clear the transition flag on first roll. Locate `const roll = () => {` (line 49) and prepend `clearTransition()` as the first statement:

```tsx
  const roll = () => {
    clearTransition()
    const dice = rollDice(2, 6)
    // ...rest unchanged
  }
```

In the JSX, insert the banner just after `<SectorHeader sector={activeSector} />` (added in Task 2):

```tsx
      <SectorHeader sector={activeSector} />
      {showBanner && fromSector && (
        <SectorEnteredBanner
          fromSector={fromSector}
          toSector={activeSector}
          onDismiss={clearTransition}
        />
      )}
```

- [ ] **Step 3: Run typecheck and tests**

```
npx tsc --noEmit
npx vitest run
```
Expected: typecheck clean, all 93+ tests pass.

- [ ] **Step 4: Commit**

```
git add src/views/MissionBoard/SectorEnteredBanner.tsx src/views/MissionBoard/AdvanceRollPanel.tsx
git commit -m "feat: SectorEnteredBanner announces sector transition on advance"
```

---

### Task 6: Manual verification

Run through the full sector-transition flow in the browser. This is a UI feature; type checks and unit tests do not prove correctness.

**Steps:**

- [ ] **Step 1: Start dev server**

```
npm run dev
```

- [ ] **Step 2: Walk the loop**

In the browser:

1. Settings → reset state (or use a fresh localStorage).
2. Barracks → make 1–2 active troopers, Prepare for Mission.
3. Mission Board → confirm SectorHeader shows above ADVANCE ROLL with `SECTOR ALPHA · C1/S1/TL2 · CLEAR · ACTIVE`.
4. Add a second sector via the chip strip `+`, name "Bravo", set TL 4, weather Harsh.
5. Roll an advance, complete mobility checks, complete one engagement exchange (any path that reaches catch_breath).
6. Confirm Catch Breath now shows AdvancePreview block with Alpha → Bravo, parameter diff, CARRIES line, RESETS line, single ADVANCE button.
7. Click ADVANCE → confirm: SectorHeader updates to show Bravo · ACTIVE, prior chip turns cleared (greyed), SectorEnteredBanner appears below the header showing changed TL and WEATHER fields only.
8. Click DISMISS → banner disappears.
9. Reload the page → confirm banner does not reappear (transition flag was cleared on dismiss).
10. Repeat the loop: catch breath → advance → reload before dismissing → confirm banner reappears (flag persisted).
11. Roll an advance → confirm banner clears automatically on roll.

- [ ] **Step 3: Cross-check on mobile width**

Resize browser to ~375px wide. Confirm SectorHeader, AdvancePreview, and SectorEnteredBanner all wrap cleanly without horizontal overflow.

- [ ] **Step 4: Stop dev server, final commit if any tweaks**

If any styling tweaks were made during verification, commit them:

```
git add -A
git commit -m "fix: sector feedback layout tweaks from manual verification"
```

If no tweaks needed, this task ends without a commit.

---

## Self-review notes

- **Spec coverage:** Three feedback layers (SectorHeader, AdvancePreview, SectorEnteredBanner) — each maps to a numbered task. Out-of-scope items (chip-click feedback, structural progression bugs, mission-complete state) are listed at the top.
- **Type consistency:** `transitionFromSectorId: string | null`, `clearTransition()`, `weatherLabel(weather: -2|-1|0|1)` — used identically across tasks.
- **No placeholders:** every code-changing step contains the exact code.
- **DRY:** `weatherLabel` factored once and reused by both AdvancePreview and SectorEnteredBanner; SectorHeader replaces the open-coded notation line in EngagementPanel.

# Pre-Rules Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix layout, dice tray UX, gear dropdown display, and UI copy issues identified during smoke testing; also resolve critical performance anti-patterns found in the codebase audit.

**Architecture:** Four independent tasks that can be executed sequentially. No new files — all changes are in-place edits to existing components. No new dependencies needed.

**Tech Stack:** React 18, Tailwind CSS v3, Zustand 5, Vitest

---

## File Structure

All modifications, no new files:

- `src/App.tsx` — root div height fix (`min-h-screen` → `h-screen overflow-hidden`), dice tray render change
- `src/views/DiceTray/DiceTray.tsx` — convert full-screen modal to slide-in panel
- `src/views/Barracks/TrooperEditor.tsx` — fix Zustand `.find()` selector + hide MOB/REQ if 0 + "NAME" → "NICKNAME"
- `src/views/MissionBoard/TrooperCardDock.tsx` — wrap `filter()` in `useMemo`
- `src/views/MissionBoard/TrooperMissionCard.tsx` — `React.memo` + `useMemo` for option arrays
- `src/views/DiceTray/MobilityCheckRoll.tsx` — wrap `filter()` in `useMemo`
- `src/views/Settings/ExportImport.tsx` — `err: any` → `err: unknown`
- `src/store/index.ts` — remove `console.warn` (replace with `throw` which is already the next line)

---

### Task 1: Performance and code quality fixes

Fixes four patterns flagged by audit: Zustand `.find()` inside selector, `filter()` without `useMemo`, untyped `catch`, and a `console.warn` that duplicates the throw below it.

**Files:**
- Modify: `src/views/Barracks/TrooperEditor.tsx:31`
- Modify: `src/views/MissionBoard/TrooperCardDock.tsx:1,6`
- Modify: `src/views/MissionBoard/TrooperMissionCard.tsx:1,46-53`
- Modify: `src/views/DiceTray/MobilityCheckRoll.tsx:1,9`
- Modify: `src/views/Settings/ExportImport.tsx:46-48`
- Modify: `src/store/index.ts:152`

- [ ] **Step 1: Fix TrooperEditor — move `.find()` out of Zustand selector**

In `src/views/Barracks/TrooperEditor.tsx`, replace line 31:
```ts
// Before
const existing = useStore(s => trooperId ? s.troopers.find(t => t.id === trooperId) : undefined)

// After — select stable array reference, derive in component body
const allTroopers = useStore(s => s.troopers)
const existing = trooperId ? allTroopers.find(t => t.id === trooperId) : undefined
```

- [ ] **Step 2: Fix TrooperCardDock — wrap filter in useMemo**

In `src/views/MissionBoard/TrooperCardDock.tsx`, add `useMemo` import and memoize the filter:
```ts
// Add import at top
import { useMemo } from 'react'

// Replace line 6
// Before:
const troopers = allTroopers.filter(t => t.active)

// After:
const troopers = useMemo(() => allTroopers.filter(t => t.active), [allTroopers])
```

- [ ] **Step 3: Fix MobilityCheckRoll — wrap filter in useMemo**

In `src/views/DiceTray/MobilityCheckRoll.tsx`, change the `import` line and memoize the filter:
```ts
// Change first line from:
import { useState } from 'react'
// To:
import { useState, useMemo } from 'react'

// Replace line 9
// Before:
const troopers = allTroopers.filter(t => t.active)

// After:
const troopers = useMemo(() => allTroopers.filter(t => t.active), [allTroopers])
```

- [ ] **Step 4: Fix TrooperMissionCard — memo + useMemo for option arrays**

In `src/views/MissionBoard/TrooperMissionCard.tsx`, wrap the component in `React.memo` and memoize the options:
```ts
// Change first import line from:
import { Dropdown, PipTracker, Stepper, GearPopover } from '../../components'
// To:
import { memo, useMemo } from 'react'
import { Dropdown, PipTracker, Stepper, GearPopover } from '../../components'
```

Replace lines 46–53 (the offOpts/defOpts creation):
```ts
// Before:
const offOpts = OFFPOS.map(o => ({
  ...o,
  disabled: o.value !== trooper.offpos && !canSetOffpos(trooper, o.value, squad, space),
}))
const defOpts = DEFPOS.map(o => ({
  ...o,
  disabled: o.value !== trooper.defpos && !canSetDefpos(trooper, o.value, squad, cover),
}))

// After:
const offOpts = useMemo(() => OFFPOS.map(o => ({
  ...o,
  disabled: o.value !== trooper.offpos && !canSetOffpos(trooper, o.value, squad, space),
})), [trooper.offpos, trooper, squad, space])

const defOpts = useMemo(() => DEFPOS.map(o => ({
  ...o,
  disabled: o.value !== trooper.defpos && !canSetDefpos(trooper, o.value, squad, cover),
})), [trooper.defpos, trooper, squad, cover])
```

Change the export at the bottom of the file from:
```ts
export default function TrooperMissionCard({ trooper, squad, cover, space }: Props) {
```
To wrap the component export with memo. Change the function declaration and its export:
```ts
// Change:
export default function TrooperMissionCard({ trooper, squad, cover, space }: Props) {
// To:
const TrooperMissionCard = memo(function TrooperMissionCard({ trooper, squad, cover, space }: Props) {
```
And at the end of the file, after the closing `}` of the function body, add:
```ts
})
export default TrooperMissionCard
```

- [ ] **Step 5: Fix ExportImport — type the catch variable**

In `src/views/Settings/ExportImport.tsx`, change line 46:
```ts
// Before:
} catch (err: any) {
  setError(err?.message ?? 'Invalid save file.')

// After:
} catch (err: unknown) {
  setError(err instanceof Error ? err.message : 'Invalid save file.')
```

- [ ] **Step 6: Fix store — remove redundant console.warn**

In `src/store/index.ts`, remove line 152 (`console.warn(...)`). The `throw` on line 153 already surfaces the error. The block becomes:
```ts
try {
  set({
    troopers: r.troopers,
    mission: r.mission ?? null,
    diceHistory: Array.isArray(r.diceHistory) ? r.diceHistory : [],
  })
} catch (e) {
  throw new Error('Invalid import: data could not be applied')
}
```

- [ ] **Step 7: Run tests to verify nothing broke**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
npm test -- --run
```
Expected: all tests pass (39 tests: gameRules, store, dice).

- [ ] **Step 8: Commit**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
git add src/views/Barracks/TrooperEditor.tsx \
        src/views/MissionBoard/TrooperCardDock.tsx \
        src/views/MissionBoard/TrooperMissionCard.tsx \
        src/views/DiceTray/MobilityCheckRoll.tsx \
        src/views/Settings/ExportImport.tsx \
        src/store/index.ts
git commit -m "fix: selector safety, memoize filters, type catch, remove console.warn"
```

---

### Task 2: App layout — fix viewport height so TrooperCardDock sticks correctly

**Root cause:** `min-h-screen` on the App root div allows the page to grow beyond the viewport. When content overflows, `sticky bottom-0` on `TrooperCardDock` pins to the bottom of the document (which is off-screen) rather than the bottom of the viewport. Changing to `h-screen overflow-hidden` caps the app at viewport height; all internal scrolling happens in the designated `flex-1 overflow-auto` containers.

**Note for agent:** After this fix, verify in the browser that (a) the Barracks view still scrolls its trooper grid if there are many troopers, (b) the Mission Board panels scroll inside the board area, and (c) the trooper card dock is visible at the bottom without scrolling.

**Files:**
- Modify: `src/App.tsx:31`

- [ ] **Step 1: Change root div height class**

In `src/App.tsx`, change the opening div on line 31 from:
```tsx
<div className="min-h-screen bg-bg text-ink font-mono flex">
```
To:
```tsx
<div className="h-screen overflow-hidden bg-bg text-ink font-mono flex" style={{ height: '100dvh' }}>
```

The `style={{ height: '100dvh' }}` overrides `h-screen` (100vh) on mobile browsers where the dynamic viewport height (dvh) correctly accounts for the shrinking address bar. The Tailwind class `h-screen` acts as a fallback for browsers that don't support dvh.

- [ ] **Step 2: Start dev server and verify layout in browser**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
npm run dev
```

Open the app at http://localhost:5173 and verify:
1. Navigate to **Mission Board** — trooper card dock should be visible at the bottom of the screen without any scrolling
2. Add content to Mission Notes — the notes area should scroll without the dock moving
3. Navigate to **Barracks** — trooper grid should still be scrollable if troopers are present
4. Resize the browser window narrower (below 768px) — mobile layout with bottom nav should still show correctly with dock above it

- [ ] **Step 3: Commit**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
git add src/App.tsx
git commit -m "fix: h-screen layout so TrooperCardDock sticks to viewport bottom"
```

---

### Task 3: TrooperEditor quick fixes — gear labels and field name

Two small changes to `TrooperEditor.tsx`:
1. The `optionsFor()` helper always renders `MOB X · REQ X` even when both are 0. Hide each segment when its value is 0.
2. The "NAME" field label should read "NICKNAME" per the SRD (this field holds the trooper's short in-game name, not their full name).

**Files:**
- Modify: `src/views/Barracks/TrooperEditor.tsx:22-28,86`

- [ ] **Step 1: Update optionsFor() to hide zero-value MOB and REQ**

In `src/views/Barracks/TrooperEditor.tsx`, replace the `optionsFor` function (lines 22–28):
```ts
// Before:
function optionsFor(type: 'weapon' | 'specialweapon' | 'specialequipment' | 'armor', includeNone = false) {
  const base = includeNone ? [{ value: '', label: '— None —' }] : []
  return base.concat(gearByType(type).map(g => ({
    value: g.name,
    label: `${g.name} · MOB ${g.mobility_cost} · REQ ${g.reqcost}${g.max_uses > 0 ? ` · USES ${g.max_uses}` : ''}`,
  })))
}

// After:
function optionsFor(type: 'weapon' | 'specialweapon' | 'specialequipment' | 'armor', includeNone = false) {
  const base = includeNone ? [{ value: '', label: '— None —' }] : []
  return base.concat(gearByType(type).map(g => {
    const parts: string[] = [g.name]
    if (g.mobility_cost !== 0) parts.push(`MOB ${g.mobility_cost}`)
    if (g.reqcost !== 0) parts.push(`REQ ${g.reqcost}`)
    if (g.max_uses > 0) parts.push(`USES ${g.max_uses}`)
    return { value: g.name, label: parts.join(' · ') }
  }))
}
```

- [ ] **Step 2: Rename "NAME" label to "NICKNAME"**

In `src/views/Barracks/TrooperEditor.tsx`, change line 86:
```tsx
// Before:
<div className="lbl text-[10px] mb-1">NAME</div>

// After:
<div className="lbl text-[10px] mb-1">NICKNAME</div>
```

- [ ] **Step 3: Run tests**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
npm test -- --run
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
git add src/views/Barracks/TrooperEditor.tsx
git commit -m "fix: hide zero MOB/REQ in gear labels, rename Name to Nickname"
```

---

### Task 4: Dice Tray — redesign as slide-in panel

**Current state:** DiceTray renders as `fixed inset-0 z-50` — a full-screen overlay with a dark backdrop. It captures the entire viewport and must be dismissed before doing anything else.

**Target state:** A slide-in panel anchored to the right edge on desktop and the bottom edge on mobile. No blocking backdrop. The main content remains visible and interactive behind it. The panel can stay open while the user navigates views.

**Layout:**
- Desktop (≥768px): `fixed top-0 right-0 h-full w-80 z-40` panel with left border. The desktop nav sidebar (w-14 = 56px) and main content remain visible to the left.
- Mobile (<768px): `fixed bottom-0 left-0 right-0 z-40 max-h-[65vh]` panel with top border. Appears above the bottom nav bar.

**Backdrop:** None on desktop. On mobile, a subtle `fixed inset-0 z-30 bg-black/40` backdrop behind the panel that dismisses it on tap (same as current dismiss behavior).

**Files:**
- Modify: `src/views/DiceTray/DiceTray.tsx` — full rewrite of layout
- Modify: `src/App.tsx:73` — the dice panel must render outside the `overflow-hidden` root to avoid clipping; it already does (`{diceOpen && <DiceTray />}` is the last child of root div)

- [ ] **Step 1: Rewrite DiceTray.tsx**

Replace the entire contents of `src/views/DiceTray/DiceTray.tsx` with:

```tsx
import { useStore } from '../../store'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import DiceControls from './DiceControls'
import MobilityCheckRoll from './MobilityCheckRoll'
import RollHistory from './RollHistory'

export default function DiceTray() {
  const setDiceTrayOpen = useStore(s => s.setDiceTrayOpen)
  const close = () => setDiceTrayOpen(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const panel = isDesktop
    ? 'fixed top-0 right-0 h-full w-80 z-40 bg-surface border-l border-border flex flex-col shadow-2xl'
    : 'fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex flex-col shadow-2xl'

  return (
    <>
      {!isDesktop && (
        <div className="fixed inset-0 z-30 bg-black/40" onClick={close} />
      )}
      <div className={panel} style={isDesktop ? undefined : { maxHeight: '65vh' }}>
        <div className="flex justify-between items-center px-4 py-3 border-b border-border flex-shrink-0">
          <div className="lbl">DICE TRAY</div>
          <button onClick={close} aria-label="Close dice tray" className="text-muted text-sm">×</button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          <DiceControls />
          <div className="border-t border-border pt-3">
            <div className="lbl text-[10px] mb-2">MOBILITY CHECKS</div>
            <MobilityCheckRoll />
          </div>
          <div className="border-t border-border pt-3">
            <RollHistory />
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify App.tsx dice render location is outside overflow-hidden root**

Open `src/App.tsx`. Confirm the structure ends with:
```tsx
      </main>

      {diceOpen && <DiceTray />}
    </div>
  )
}
```
The `{diceOpen && <DiceTray />}` must be the last child of the root `<div>` (before its closing tag), not inside `<main>`. This ensures the fixed panel is not clipped by the `overflow-hidden` on the root. No changes needed if this is already the case.

- [ ] **Step 3: Start dev server and test dice tray**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
npm run dev
```

Verify at http://localhost:5173:
1. **Desktop:** Click the ⬡ dice button in the sidebar. A panel should slide in from the right, ~320px wide, full height. The mission board (or whatever view is active) should be visible on the left. Close button (×) dismisses it.
2. **Mobile (narrow browser <768px):** Click the ⬡ button in the top header. A panel should appear from the bottom, occupying ~65% of the screen height. A semi-transparent backdrop covers the content above. Tapping the backdrop or the × button dismisses it.
3. **Persistence test:** Open the tray, navigate to a different view using the nav — the tray should stay open (state is in Zustand, not local to the view).

- [ ] **Step 4: Run tests**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
npm test -- --run
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/michael/Documents/Coding/Projects/Danger Close Game Board"
git add src/views/DiceTray/DiceTray.tsx
git commit -m "feat: dice tray as slide-in panel, not full-screen modal"
```

---

## Self-Review

**Spec coverage check against feedback:**

| Feedback item | Covered by |
|---|---|
| Mission screen cards below viewport | Task 2 (h-screen fix) |
| REQ/MOB not shown if 0 | Task 3, Step 1 |
| "Name" → "Nickname" | Task 3, Step 2 |
| Dice tray not full-screen takeover | Task 4 |
| Larger interface rework (noted, deferred) | Out of scope — tracked in memory |
| Rules Application items | Not in scope — separate plan |

**Performance audit coverage:**

| Finding | Covered by |
|---|---|
| `.find()` in Zustand selector (TrooperEditor) | Task 1, Step 1 |
| `filter()` without useMemo (TrooperCardDock) | Task 1, Step 2 |
| `filter()` without useMemo (MobilityCheckRoll) | Task 1, Step 3 |
| TrooperMissionCard not memoized | Task 1, Step 4 |
| `catch (err: any)` in ExportImport | Task 1, Step 5 |
| `console.warn` in store | Task 1, Step 6 |

**Type consistency:** All types and method references match existing codebase — no new functions or interfaces introduced.

**Placeholder scan:** No TBDs, no vague instructions. Every step contains exact code.

# Danger Close Play Aid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based React app that serves as a digital play surface for the Danger Close TTRPG — replacing nothing, but reducing friction for solo play across desktop and mobile.

**Architecture:** Single-page React app (Vite + TypeScript). Zustand `persist` store writes to `localStorage`. No backend, no routing library — state-based view switching. Game rules live as pure functions in `src/utils/gameRules.ts` and are covered by unit tests. Static deploy to GitHub Pages/Netlify.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS v3, Zustand (+ persist middleware), Vitest + React Testing Library, Share Tech Mono (Google Fonts).

**Source of truth:** Danger Close SRD v0.96.6 — https://lars1808.github.io/DANGER-CLOSE-SRD/
**Spec:** `docs/superpowers/specs/2026-04-19-danger-close-play-aid-design.md`

---

## File Structure

```
src/
  components/
    PipTracker.tsx          # 0–max clickable pip row (used for grit, ammo, uses)
    Dropdown.tsx            # Styled <select> with label + disabled-option support
    Modal.tsx               # Centred modal with backdrop
    ConfirmDialog.tsx       # Destructive-action confirmation
    GearPopover.tsx         # Shows full gear properties text on tap
    StatusBadge.tsx         # Colour-coded status pill
    Stepper.tsx             # − / value / + control for integers
  views/
    Barracks/
      Barracks.tsx          # Grid + Prepare for Mission button + editor modal host
      TrooperCard.tsx       # Roster card (view mode)
      TrooperEditor.tsx     # Modal editor form
    MissionBoard/
      MissionBoard.tsx      # Layout: AdvanceRoll → SectorMomentum → Notes → Dock
      AdvanceRollPanel.tsx  # Multi-step advance roll flow
      MobilityCheckPhase.tsx# Sub-panel for per-trooper checks
      SectorMomentumPanel.tsx
      MissionNotes.tsx
      TrooperCardDock.tsx   # Sticky bottom dock host
      TrooperMissionCard.tsx# Individual mission-state card
    DiceTray/
      DiceTray.tsx          # Modal root
      DiceControls.tsx      # Quick-roll + modifier + label
      MobilityCheckRoll.tsx # Roll-per-trooper section
      RollHistory.tsx
    Settings/
      Settings.tsx          # Hosts ExportImport + future slots
      ExportImport.tsx
  store/
    index.ts                # Zustand store + persist middleware
  data/
    gear.ts                 # Full bundled armoury catalogue
  utils/
    gameRules.ts            # Pure functions: modifier, result table, constraints, flanking
    dice.ts                 # rollDie, rollDice
    id.ts                   # nanoid/crypto.randomUUID wrapper
  hooks/
    useMediaQuery.ts        # For responsive nav (desktop sidebar vs mobile tabs)
  types.ts                  # All interfaces
  App.tsx                   # Shell: sidebar + view switcher + DiceTray portal
  main.tsx                  # React root
  index.css                 # Tailwind directives + :root vars + Share Tech Mono
tests/
  gameRules.test.ts
  dice.test.ts
  store.test.ts
index.html
tailwind.config.js
postcss.config.js
vite.config.ts
tsconfig.json
vitest.config.ts
package.json
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore`

- [ ] **Step 1: Init Vite React+TS project**

Run: `npm create vite@latest . -- --template react-ts` (choose to ignore/merge existing files if prompted; we'll overwrite)
Then: `npm install`

- [ ] **Step 2: Install runtime dependencies**

Run:
```bash
npm install zustand
npm install -D tailwindcss@^3 postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom @types/node
```

- [ ] **Step 3: Initialise Tailwind**

Run: `npx tailwindcss init -p`

Replace `tailwind.config.js` with:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#161a17',
        surface: '#1c2119',
        border: '#2c3a2c',
        ink: '#bbbaa8',
        muted: '#687868',
        ok: '#5a9e6e',
        neutral: '#a0a090',
        bad: '#c93535',
        warn: '#c8a030',
        wound: '#d45f27',
        dockfade: '#0e1210',
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        wider2: '0.12em',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Write `src/index.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
  margin: 0;
  background: #161a17;
  color: #bbbaa8;
  font-family: 'Share Tech Mono', ui-monospace, monospace;
  font-size: 14px;
}

button { font-family: inherit; }

/* Uppercase label utility */
.lbl { text-transform: uppercase; letter-spacing: 0.12em; color: #687868; font-size: 11px; }
```

- [ ] **Step 5: Configure `vite.config.ts` (base path for GH Pages)**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
})
```

- [ ] **Step 6: Configure `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
})
```

Create `tests/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Replace `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Danger Close</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Replace `src/main.tsx` and `src/App.tsx` with placeholder shells**

`src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

`src/App.tsx`:
```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-bg text-ink font-mono p-6">
      <h1 className="lbl text-ink">DANGER CLOSE</h1>
    </div>
  )
}
```

- [ ] **Step 9: Add npm scripts**

In `package.json` `"scripts"`:
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 10: Verify build**

Run: `npm run dev`
Expected: Vite serves on localhost, page shows "DANGER CLOSE" in monospace on dark background. Kill with Ctrl-C.
Run: `npm run build`
Expected: Build succeeds, outputs `dist/`.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite+React+TS+Tailwind+Zustand+Vitest"
```

---

## Task 2: Types, Gear Data, Game Rules (with tests)

**Files:**
- Create: `src/types.ts`, `src/data/gear.ts`, `src/utils/gameRules.ts`, `src/utils/dice.ts`, `src/utils/id.ts`
- Create: `tests/gameRules.test.ts`, `tests/dice.test.ts`

- [ ] **Step 1: Write `src/types.ts`**

```ts
export type TrooperStatus = 'ok' | 'grazed' | 'wounded' | 'bleedingout' | 'dead'
export type OffensivePosition = 'limited' | 'engaged' | 'flanking'
export type DefensivePosition = 'flanked' | 'incover' | 'fortified'
export type GearType = 'weapon' | 'specialweapon' | 'specialequipment' | 'armor'
export type AdvanceResult = 'ambushed' | 'spotted' | 'surprise' | 'overwhelm'

export interface GearItem {
  name: string
  geartype: GearType
  description: string
  properties: string
  mobility_cost: number   // subtracted from 5
  reqcost: number
  max_uses: number        // -1 = unlimited
}

export interface Trooper {
  id: string
  name: string
  fullname: string
  callsign: string
  active: boolean
  perkpoints: number
  mobility: number         // effective base, auto-computed (5 − gear costs)
  armor: string
  weapon: string
  special_weapon: string
  special_gear: string
  perk: string
  notes: string

  // Mission-state
  grit: number
  ammo: number
  status: TrooperStatus
  offpos: OffensivePosition
  defpos: DefensivePosition
  suppressed: boolean
  def_modifier: number
  special_weapon_uses: number   // -1 unlimited
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
```

- [ ] **Step 2: Write `src/utils/id.ts`**

```ts
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
```

- [ ] **Step 3: Write `src/utils/dice.ts`**

```ts
export function rollDie(sides = 6): number {
  return Math.floor(Math.random() * sides) + 1
}

export function rollDice(count: number, sides = 6): number[] {
  return Array.from({ length: count }, () => rollDie(sides))
}

export function parseDiceNotation(dice: string): { count: number; sides: number } {
  // "2d6", "1d6", "d66" → special: d66 is two d6 concatenated
  const m = dice.match(/^(\d*)d(\d+)$/)
  if (!m) throw new Error(`Invalid dice notation: ${dice}`)
  const count = m[1] === '' ? 1 : parseInt(m[1], 10)
  const sides = parseInt(m[2], 10)
  return { count, sides }
}
```

- [ ] **Step 4: Write `tests/dice.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { rollDie, rollDice, parseDiceNotation } from '../src/utils/dice'

describe('dice', () => {
  it('rollDie returns 1..6', () => {
    for (let i = 0; i < 200; i++) {
      const r = rollDie()
      expect(r).toBeGreaterThanOrEqual(1)
      expect(r).toBeLessThanOrEqual(6)
    }
  })
  it('rollDice returns n results', () => {
    expect(rollDice(3)).toHaveLength(3)
  })
  it('parseDiceNotation parses 2d6', () => {
    expect(parseDiceNotation('2d6')).toEqual({ count: 2, sides: 6 })
  })
  it('parseDiceNotation parses d6', () => {
    expect(parseDiceNotation('d6')).toEqual({ count: 1, sides: 6 })
  })
})
```

- [ ] **Step 5: Run dice tests — expect fail (not implemented yet, then pass)**

Run: `npm test -- dice`
Expected: PASS (dice.ts already implemented in step 3).

- [ ] **Step 6: Write `src/utils/gameRules.ts`**

```ts
import type {
  Trooper, MissionState, AdvanceResult, OffensivePosition, DefensivePosition,
} from '../types'

export function effectiveMobility(t: Trooper): number {
  const penalty = (t.status === 'wounded' || t.status === 'bleedingout') ? 1 : 0
  return Math.max(0, t.mobility - penalty)
}

export function flankingBonus(effMob: number): number {
  if (effMob <= 3) return 1
  if (effMob === 4) return 2
  return 3
}

export function baseMobilityFromCosts(costs: number[]): number {
  // costs are negative (e.g. Heavy Armor = -2)
  return 5 + costs.reduce((acc, c) => acc + c, 0)
}

export function woundCount(troopers: Trooper[]): number {
  return troopers.filter(
    t => t.active && (t.status === 'wounded' || t.status === 'bleedingout'),
  ).length
}

export function advanceModifier(args: {
  advanceRolls: number
  wounds: number
  weather: number
  tl: number
  stealth: boolean
  assaultAmmo: number
}): {
  fatigue: number; wounds: number; weather: number; tl: number;
  stealth: number; assault: number; total: number
} {
  const fatigue = -Math.floor(args.advanceRolls / 3)
  const wounds = -args.wounds
  const weather = args.weather
  const tl = -args.tl
  const stealth = args.stealth ? 3 : 0
  const assault = args.assaultAmmo
  return {
    fatigue, wounds, weather, tl, stealth, assault,
    total: fatigue + wounds + weather + tl + stealth + assault,
  }
}

export function advanceResult(total: number): AdvanceResult {
  if (total <= 3) return 'ambushed'
  if (total <= 7) return 'spotted'
  if (total <= 10) return 'surprise'
  return 'overwhelm'
}

export function momentumForResult(r: AdvanceResult): number | null {
  if (r === 'ambushed') return -1
  if (r === 'spotted') return 0
  if (r === 'surprise') return 1
  return null // overwhelm does not change momentum
}

export function defposForResult(r: AdvanceResult): DefensivePosition | null {
  if (r === 'ambushed') return 'flanked'
  if (r === 'spotted') return 'incover'
  if (r === 'surprise') return 'fortified'
  return null
}

export function offposFromCheck(r: AdvanceResult, pass: boolean): OffensivePosition {
  if (r === 'ambushed') return pass ? 'engaged' : 'limited'
  // spotted / surprise
  return pass ? 'flanking' : 'engaged'
}

export function mobilityCheck(effMob: number, roll: number): boolean {
  if (effMob === 0) return false // auto-fail at 0
  return roll <= effMob
}

export function clampMomentum(v: number): number {
  return Math.max(-3, Math.min(3, v))
}
export function clampGrit(v: number): number { return Math.max(0, Math.min(3, v)) }
export function clampAmmo(v: number): number { return Math.max(0, Math.min(3, v)) }
export function clampUses(v: number, max: number): number {
  if (max < 0) return max // unlimited sentinel
  return Math.max(0, Math.min(max, v))
}

// Position constraints for the active squad. Returns disabled option map.
export function fortifiedLimit(cover: 0 | 1 | 2): number {
  if (cover === 0) return 0
  if (cover === 1) return 2
  return Infinity
}
export function flankingLimit(space: 0 | 1 | 2): number {
  if (space === 0) return 0
  if (space === 1) return 2
  return Infinity
}

export function canSetDefpos(
  target: Trooper,
  next: DefensivePosition,
  squad: Trooper[],
  cover: 0 | 1 | 2,
): boolean {
  if (next !== 'fortified') return true
  const currentFortified = squad.filter(
    t => t.active && t.id !== target.id && t.defpos === 'fortified',
  ).length
  return currentFortified + 1 <= fortifiedLimit(cover)
}

export function canSetOffpos(
  target: Trooper,
  next: OffensivePosition,
  squad: Trooper[],
  space: 0 | 1 | 2,
): boolean {
  if (next !== 'flanking') return true
  const currentFlanking = squad.filter(
    t => t.active && t.id !== target.id && t.offpos === 'flanking',
  ).length
  return currentFlanking + 1 <= flankingLimit(space)
}

export function stealthShouldClear(r: AdvanceResult): boolean {
  return r === 'ambushed' || r === 'spotted'
}

export function infiltrationPicks(passCount: number, stealthWasActive: boolean): number {
  if (!stealthWasActive) return 0
  return Math.floor(passCount / 2)
}
```

- [ ] **Step 7: Write `tests/gameRules.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  effectiveMobility, flankingBonus, advanceModifier, advanceResult,
  momentumForResult, defposForResult, offposFromCheck, mobilityCheck,
  clampMomentum, fortifiedLimit, flankingLimit, canSetDefpos, canSetOffpos,
  stealthShouldClear, infiltrationPicks, woundCount,
} from '../src/utils/gameRules'
import type { Trooper } from '../src/types'

function mkTrooper(p: Partial<Trooper> = {}): Trooper {
  return {
    id: p.id ?? 't1', name: 'X', fullname: '', callsign: '', active: true,
    perkpoints: 0, mobility: 4, armor: '', weapon: '', special_weapon: '',
    special_gear: '', perk: '', notes: '', grit: 3, ammo: 3, status: 'ok',
    offpos: 'engaged', defpos: 'incover', suppressed: false, def_modifier: 0,
    special_weapon_uses: -1, special_gear_uses: -1, ...p,
  }
}

describe('effectiveMobility', () => {
  it('subtracts 1 for wounded', () => {
    expect(effectiveMobility(mkTrooper({ mobility: 4, status: 'wounded' }))).toBe(3)
  })
  it('subtracts 1 for bleedingout', () => {
    expect(effectiveMobility(mkTrooper({ mobility: 3, status: 'bleedingout' }))).toBe(2)
  })
  it('no change for ok/grazed', () => {
    expect(effectiveMobility(mkTrooper({ mobility: 4, status: 'grazed' }))).toBe(4)
  })
  it('clamps at 0', () => {
    expect(effectiveMobility(mkTrooper({ mobility: 0, status: 'wounded' }))).toBe(0)
  })
})

describe('flankingBonus', () => {
  it('0–3 = +1', () => { expect(flankingBonus(3)).toBe(1) })
  it('4 = +2', () => { expect(flankingBonus(4)).toBe(2) })
  it('5 = +3', () => { expect(flankingBonus(5)).toBe(3) })
})

describe('advanceModifier', () => {
  it('fatigue is −floor(rolls/3)', () => {
    const m = advanceModifier({ advanceRolls: 7, wounds: 0, weather: 0, tl: 1, stealth: false, assaultAmmo: 0 })
    expect(m.fatigue).toBe(-2)
  })
  it('combines all parts', () => {
    const m = advanceModifier({ advanceRolls: 3, wounds: 1, weather: -1, tl: 2, stealth: true, assaultAmmo: 2 })
    // fatigue=-1, wounds=-1, weather=-1, tl=-2, stealth=+3, assault=+2
    expect(m.total).toBe(0)
  })
})

describe('advanceResult table', () => {
  it('≤3 ambushed', () => { expect(advanceResult(3)).toBe('ambushed') })
  it('4–7 spotted', () => { expect(advanceResult(7)).toBe('spotted') })
  it('8–10 surprise', () => { expect(advanceResult(10)).toBe('surprise') })
  it('≥11 overwhelm', () => { expect(advanceResult(11)).toBe('overwhelm') })
})

describe('derived from result', () => {
  it('momentum', () => {
    expect(momentumForResult('ambushed')).toBe(-1)
    expect(momentumForResult('spotted')).toBe(0)
    expect(momentumForResult('surprise')).toBe(1)
    expect(momentumForResult('overwhelm')).toBeNull()
  })
  it('defpos', () => {
    expect(defposForResult('ambushed')).toBe('flanked')
    expect(defposForResult('spotted')).toBe('incover')
    expect(defposForResult('surprise')).toBe('fortified')
    expect(defposForResult('overwhelm')).toBeNull()
  })
})

describe('offpos from mobility check', () => {
  it('ambushed pass=engaged fail=limited', () => {
    expect(offposFromCheck('ambushed', true)).toBe('engaged')
    expect(offposFromCheck('ambushed', false)).toBe('limited')
  })
  it('spotted/surprise pass=flanking fail=engaged', () => {
    expect(offposFromCheck('spotted', true)).toBe('flanking')
    expect(offposFromCheck('spotted', false)).toBe('engaged')
    expect(offposFromCheck('surprise', true)).toBe('flanking')
  })
})

describe('mobilityCheck', () => {
  it('passes when roll ≤ mobility', () => {
    expect(mobilityCheck(4, 4)).toBe(true)
    expect(mobilityCheck(4, 3)).toBe(true)
  })
  it('fails when roll > mobility', () => {
    expect(mobilityCheck(4, 5)).toBe(false)
  })
  it('auto-fails at mobility 0', () => {
    expect(mobilityCheck(0, 1)).toBe(false)
  })
})

describe('clampMomentum', () => {
  it('clamps to -3..3', () => {
    expect(clampMomentum(-5)).toBe(-3)
    expect(clampMomentum(5)).toBe(3)
    expect(clampMomentum(0)).toBe(0)
  })
})

describe('position constraints', () => {
  it('fortifiedLimit', () => {
    expect(fortifiedLimit(0)).toBe(0)
    expect(fortifiedLimit(1)).toBe(2)
    expect(fortifiedLimit(2)).toBe(Infinity)
  })
  it('flankingLimit', () => {
    expect(flankingLimit(0)).toBe(0)
    expect(flankingLimit(1)).toBe(2)
    expect(flankingLimit(2)).toBe(Infinity)
  })
  it('canSetDefpos blocks 3rd fortified at cover 1', () => {
    const squad = [
      mkTrooper({ id: 'a', defpos: 'fortified' }),
      mkTrooper({ id: 'b', defpos: 'fortified' }),
      mkTrooper({ id: 'c', defpos: 'incover' }),
    ]
    expect(canSetDefpos(squad[2], 'fortified', squad, 1)).toBe(false)
    expect(canSetDefpos(squad[0], 'fortified', squad, 1)).toBe(true) // reassigning self
  })
  it('canSetOffpos blocks flanking at space 0', () => {
    const squad = [mkTrooper({ id: 'a' })]
    expect(canSetOffpos(squad[0], 'flanking', squad, 0)).toBe(false)
  })
})

describe('stealthShouldClear', () => {
  it('clears on ambushed/spotted, keeps on surprise/overwhelm', () => {
    expect(stealthShouldClear('ambushed')).toBe(true)
    expect(stealthShouldClear('spotted')).toBe(true)
    expect(stealthShouldClear('surprise')).toBe(false)
    expect(stealthShouldClear('overwhelm')).toBe(false)
  })
})

describe('infiltrationPicks', () => {
  it('floor(passes/2) if stealth was active', () => {
    expect(infiltrationPicks(3, true)).toBe(1)
    expect(infiltrationPicks(4, true)).toBe(2)
  })
  it('0 if stealth was not active', () => {
    expect(infiltrationPicks(5, false)).toBe(0)
  })
})

describe('woundCount', () => {
  it('counts active wounded and bleedingout only', () => {
    const squad = [
      mkTrooper({ id: 'a', status: 'wounded' }),
      mkTrooper({ id: 'b', status: 'bleedingout' }),
      mkTrooper({ id: 'c', status: 'grazed' }),
      mkTrooper({ id: 'd', status: 'wounded', active: false }),
    ]
    expect(woundCount(squad)).toBe(2)
  })
})
```

- [ ] **Step 8: Run game rules tests — expect PASS**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 9: Write `src/data/gear.ts`**

```ts
import type { GearItem } from '../types'

export const GEAR: GearItem[] = [
  // Armor
  { name: 'Light Armor', geartype: 'armor', description: 'Minimal plating.', properties: '−1 to final Defense Roll result.', mobility_cost: 0, reqcost: 0, max_uses: -1 },
  { name: 'Medium Armor', geartype: 'armor', description: 'Standard issue.', properties: 'No special properties. Standard issue.', mobility_cost: -1, reqcost: 0, max_uses: -1 },
  { name: 'Heavy Armor', geartype: 'armor', description: 'Full plating.', properties: '+1 to final Defense Roll result.', mobility_cost: -2, reqcost: 0, max_uses: -1 },

  // Primary weapons
  { name: 'Carbine', geartype: 'weapon', description: 'Close-quarters.', properties: '+1 ATK when Engaged in Tight Space (Cover 0). −1 ATK when Engaged in Open Space (Cover 2).', mobility_cost: 0, reqcost: 0, max_uses: -1 },
  { name: 'Assault Rifle', geartype: 'weapon', description: 'Reliable workhorse.', properties: 'No special properties. The reliable workhorse.', mobility_cost: 0, reqcost: 0, max_uses: -1 },
  { name: 'Marksman Rifle', geartype: 'weapon', description: 'Long range.', properties: '+1 ATK when Engaged in Exposed Cover (Cover 0). −1 ATK when Engaged in Dense Cover (Cover 2).', mobility_cost: 0, reqcost: 0, max_uses: -1 },

  // Special weapons
  { name: 'Utility Kit', geartype: 'specialweapon', description: 'Smoke / Flashbang / Flare.', properties: 'Active (1 Ammo each): Smoke — Squad gains +1 Mobility this Exchange, user may also Move. Flashbang (Tight Space only) — user gains ATK benefit of Flanking this Exchange. Flare (outdoors) — signal aerial strike; +2 ATK if sky obstructed, +3 ATK normally, +4 ATK open sky; all Flanked Troopers make Mobility Check (fail = 1d3 Injury).', mobility_cost: 0, reqcost: 0, max_uses: -1 },
  { name: 'LMG', geartype: 'specialweapon', description: 'Suppressing fire.', properties: 'Passive: +1 DEF for any Trooper receiving Covering Fire from this weapon.', mobility_cost: -1, reqcost: 1, max_uses: -1 },
  { name: 'HMG', geartype: 'specialweapon', description: 'Heavy support.', properties: 'Passive: +1 ATK when Fortified. Active (1 Ammo): Provide Covering Fire for up to 3 Troopers this round.', mobility_cost: -2, reqcost: 2, max_uses: -1 },
  { name: 'Sniper Rifle', geartype: 'specialweapon', description: 'Precision.', properties: 'Passive: +1 ATK when Fortified. +2 ATK when Fortified and did not Move last Exchange.', mobility_cost: -1, reqcost: 1, max_uses: -1 },
  { name: 'Grenade Launcher', geartype: 'specialweapon', description: 'Explosive utility.', properties: 'Active (1 Ammo each): Deal 1 Hit to a Hard Target, OR grant another Trooper the Flanking ATK bonus on the next Offense Roll. Multiple grenades may be fired in one attack.', mobility_cost: -1, reqcost: 1, max_uses: -1 },
  { name: 'Melee Weapon', geartype: 'specialweapon', description: 'Close combat.', properties: 'Passive: When Moving Up, choose to go Flanked instead of Flanking — gain +3 ATK (Flanking bonus included).', mobility_cost: -1, reqcost: 0, max_uses: -1 },
  { name: 'Rocket Launcher', geartype: 'specialweapon', description: 'Single-use.', properties: 'Active (single use): +3 ATK, OR deal 2 Hits to a Hard Target.', mobility_cost: -1, reqcost: 1, max_uses: 1 },
  { name: 'Plasma Rifle', geartype: 'specialweapon', description: 'Volatile.', properties: 'Active (no Ammo cost): Roll 1d6. 1 = +2 Injury, weapon destroyed. 2–3 = +1 Injury, +1 ATK. 4–5 = +2 ATK or 1 Hit (Hard Target). 6 = +3 ATK or 2 Hits (Hard Target).', mobility_cost: -1, reqcost: 3, max_uses: -1 },

  // Special equipment
  { name: 'Demolition Charges', geartype: 'specialequipment', description: 'Breach objectives.', properties: 'No combat use. Required for Breach objectives. Place during Engagement if Momentum ≥ GAINING GROUND: 2 Exchanges (Move Up + set charges).', mobility_cost: -1, reqcost: 0, max_uses: -1 },
  { name: 'Jump Pack', geartype: 'specialequipment', description: 'Reposition.', properties: 'Once per Engagement: instantly shift to any Offensive/Defensive position. Resets each Engagement (player manually resets the use pip).', mobility_cost: -1, reqcost: 2, max_uses: 1 },
  { name: 'Drone Gear', geartype: 'specialequipment', description: 'Recon.', properties: '+1 to each Advance Roll. Does not stack with multiple Drone Gear.', mobility_cost: -1, reqcost: 0, max_uses: -1 },
  { name: 'Medic Gear', geartype: 'specialequipment', description: 'Field aid.', properties: 'Patch Wounded Troopers back to OK when out of combat (Catch Breath).', mobility_cost: -1, reqcost: 0, max_uses: -1 },
  { name: 'Radio Gear', geartype: 'specialequipment', description: 'Artillery.', properties: 'Once per Mission: call an artillery strike on the current Sector. Hits in 1d2 Exchanges. Effect: +2 Momentum instantly, destroys all ground-based Hard Targets. All Troopers make a Mobility Check; failure = 1d3 Injury.', mobility_cost: -1, reqcost: 1, max_uses: 1 },
  { name: 'Supply Backpack', geartype: 'specialequipment', description: '+6 extra Ammo.', properties: 'Holds 6 extra Ammo. Can be redistributed to Troopers out of combat.', mobility_cost: -1, reqcost: 1, max_uses: -1 },
  { name: 'Environmental Gear', geartype: 'specialequipment', description: 'Hazard protection.', properties: 'Allows Troopers to traverse hazardous terrain or survive dangerous environments. One set covers 2 Troopers.', mobility_cost: -1, reqcost: 0, max_uses: -1 },
]

export function gearByName(name: string): GearItem | undefined {
  return GEAR.find(g => g.name === name)
}

export function gearByType(type: GearItem['geartype']): GearItem[] {
  return GEAR.filter(g => g.geartype === type)
}
```

- [ ] **Step 10: Commit**

```bash
git add src/types.ts src/data/gear.ts src/utils tests/gameRules.test.ts tests/dice.test.ts
git commit -m "feat: add types, gear catalogue, game rules with tests"
```

---

## Task 3: Zustand Store with Persistence

**Files:**
- Create: `src/store/index.ts`
- Create: `tests/store.test.ts`

- [ ] **Step 1: Write `src/store/index.ts`**

```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AppState, Trooper, MissionState, DiceRoll, ApplyAdvancePayload,
} from '../types'
import { gearByName } from '../data/gear'
import {
  clampMomentum, clampGrit, clampAmmo, clampUses,
  defposForResult, momentumForResult, stealthShouldClear,
} from '../utils/gameRules'
import { newId } from '../utils/id'

type View = 'barracks' | 'mission' | 'settings'

interface Store extends AppState {
  currentView: View
  diceTrayOpen: boolean

  addTrooper: (t: Omit<Trooper, 'id'>) => void
  updateTrooper: (id: string, patch: Partial<Trooper>) => void
  deleteTrooper: (id: string) => void
  prepareMission: () => void

  setMission: (patch: Partial<MissionState>) => void
  resetMission: () => void
  applyAdvanceResult: (p: ApplyAdvancePayload) => void

  addRoll: (roll: DiceRoll) => void
  clearHistory: () => void

  setView: (v: View) => void
  setDiceTrayOpen: (open: boolean) => void

  importState: (raw: unknown) => void
  exportState: () => AppState
}

const DEFAULT_MISSION: MissionState = {
  id: 'current',
  name: 'Current Mission',
  sector: { name: 'Sector', cover: 1, space: 1, tl: 2, weather: 0 },
  momentum: 0,
  advance_rolls: 0,
  stealth: false,
  notes: '',
}

function maxUsesFor(gearName: string): number {
  const g = gearByName(gearName)
  if (!g || g.max_uses < 0) return -1
  return g.max_uses
}

function resetTrooperForMission(t: Trooper): Trooper {
  return {
    ...t,
    grit: 3,
    ammo: 3,
    status: 'ok',
    offpos: 'engaged',
    defpos: 'incover',
    suppressed: false,
    def_modifier: 0,
    special_weapon_uses: t.special_weapon ? maxUsesFor(t.special_weapon) : -1,
    special_gear_uses: t.special_gear ? maxUsesFor(t.special_gear) : -1,
  }
}

const DICE_HISTORY_CAP = 20

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      troopers: [],
      mission: null,
      diceHistory: [],
      currentView: 'barracks',
      diceTrayOpen: false,

      addTrooper: (t) => set((s) => ({ troopers: [...s.troopers, { ...t, id: newId() }] })),

      updateTrooper: (id, patch) => set((s) => ({
        troopers: s.troopers.map(t => t.id === id ? clampTrooper({ ...t, ...patch }) : t),
      })),

      deleteTrooper: (id) => set((s) => ({ troopers: s.troopers.filter(t => t.id !== id) })),

      prepareMission: () => set((s) => ({
        troopers: s.troopers.map(t => t.active ? resetTrooperForMission(t) : t),
        mission: s.mission ?? { ...DEFAULT_MISSION, id: newId() },
      })),

      setMission: (patch) => set((s) => ({
        mission: s.mission ? { ...s.mission, ...patch, momentum: 'momentum' in patch ? clampMomentum(patch.momentum!) : s.mission.momentum } : null,
      })),

      resetMission: () => set(() => ({ mission: { ...DEFAULT_MISSION, id: newId() } })),

      applyAdvanceResult: ({ result, trooperOffpos }) => set((s) => {
        if (!s.mission) return s
        const dpos = defposForResult(result)
        const mom = momentumForResult(result)
        const clearStealth = stealthShouldClear(result)
        const nextTroopers = s.troopers.map(t => {
          if (!t.active) return t
          const next = { ...t }
          if (dpos) next.defpos = dpos
          if (trooperOffpos && trooperOffpos[t.id]) next.offpos = trooperOffpos[t.id]
          return next
        })
        return {
          troopers: nextTroopers,
          mission: {
            ...s.mission,
            momentum: mom !== null ? clampMomentum(mom) : s.mission.momentum,
            advance_rolls: s.mission.advance_rolls + 1,
            stealth: clearStealth ? false : s.mission.stealth,
          },
        }
      }),

      addRoll: (roll) => set((s) => ({
        diceHistory: [roll, ...s.diceHistory].slice(0, DICE_HISTORY_CAP),
      })),

      clearHistory: () => set({ diceHistory: [] }),

      setView: (v) => set({ currentView: v }),
      setDiceTrayOpen: (open) => set({ diceTrayOpen: open }),

      importState: (raw) => {
        if (!raw || typeof raw !== 'object') throw new Error('Invalid import: not an object')
        const r = raw as Partial<AppState>
        if (!Array.isArray(r.troopers)) throw new Error('Invalid import: missing troopers')
        set({
          troopers: r.troopers,
          mission: r.mission ?? null,
          diceHistory: Array.isArray(r.diceHistory) ? r.diceHistory : [],
        })
      },

      exportState: () => {
        const { troopers, mission, diceHistory } = get()
        return { troopers, mission, diceHistory }
      },
    }),
    {
      name: 'danger-close-app-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        troopers: s.troopers,
        mission: s.mission,
        diceHistory: s.diceHistory,
      }) as unknown as Store,
      version: 1,
    },
  ),
)

function clampTrooper(t: Trooper): Trooper {
  const swMax = t.special_weapon ? maxUsesFor(t.special_weapon) : -1
  const sgMax = t.special_gear ? maxUsesFor(t.special_gear) : -1
  return {
    ...t,
    grit: clampGrit(t.grit),
    ammo: clampAmmo(t.ammo),
    special_weapon_uses: clampUses(t.special_weapon_uses, swMax),
    special_gear_uses: clampUses(t.special_gear_uses, sgMax),
  }
}
```

- [ ] **Step 2: Write `tests/store.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../src/store'

function resetStore() {
  localStorage.clear()
  useStore.setState({
    troopers: [], mission: null, diceHistory: [],
    currentView: 'barracks', diceTrayOpen: false,
  })
}

describe('store', () => {
  beforeEach(resetStore)

  it('addTrooper assigns an id', () => {
    useStore.getState().addTrooper({
      name: 'Warden', fullname: '', callsign: '', active: true, perkpoints: 0,
      mobility: 4, armor: 'Medium Armor', weapon: 'Assault Rifle',
      special_weapon: '', special_gear: '', perk: '', notes: '',
      grit: 3, ammo: 3, status: 'ok', offpos: 'engaged', defpos: 'incover',
      suppressed: false, def_modifier: 0, special_weapon_uses: -1, special_gear_uses: -1,
    })
    const t = useStore.getState().troopers[0]
    expect(t.id).toBeTruthy()
    expect(t.name).toBe('Warden')
  })

  it('prepareMission resets active trooper mission-state', () => {
    useStore.setState({
      troopers: [{
        id: 'a', name: 'A', fullname: '', callsign: '', active: true, perkpoints: 0,
        mobility: 4, armor: 'Medium Armor', weapon: 'Assault Rifle',
        special_weapon: 'Rocket Launcher', special_gear: '', perk: '', notes: '',
        grit: 0, ammo: 0, status: 'wounded', offpos: 'limited', defpos: 'flanked',
        suppressed: true, def_modifier: -1, special_weapon_uses: 0, special_gear_uses: -1,
      }],
    })
    useStore.getState().prepareMission()
    const t = useStore.getState().troopers[0]
    expect(t.grit).toBe(3)
    expect(t.ammo).toBe(3)
    expect(t.status).toBe('ok')
    expect(t.special_weapon_uses).toBe(1) // Rocket Launcher max_uses = 1
  })

  it('applyAdvanceResult sets defpos and momentum', () => {
    useStore.setState({
      mission: { id: 'm', name: '', sector: { name: '', cover: 1, space: 1, tl: 2, weather: 0 }, momentum: 0, advance_rolls: 0, stealth: true, notes: '' },
      troopers: [{
        id: 'a', name: 'A', fullname: '', callsign: '', active: true, perkpoints: 0,
        mobility: 4, armor: '', weapon: '', special_weapon: '', special_gear: '',
        perk: '', notes: '', grit: 3, ammo: 3, status: 'ok', offpos: 'engaged',
        defpos: 'incover', suppressed: false, def_modifier: 0,
        special_weapon_uses: -1, special_gear_uses: -1,
      }],
    })
    useStore.getState().applyAdvanceResult({ result: 'ambushed', trooperOffpos: { a: 'limited' } })
    const s = useStore.getState()
    expect(s.troopers[0].defpos).toBe('flanked')
    expect(s.troopers[0].offpos).toBe('limited')
    expect(s.mission!.momentum).toBe(-1)
    expect(s.mission!.stealth).toBe(false)
    expect(s.mission!.advance_rolls).toBe(1)
  })

  it('addRoll caps history at 20', () => {
    for (let i = 0; i < 25; i++) {
      useStore.getState().addRoll({
        id: String(i), timestamp: i, label: 'r', dice: '1d6',
        results: [1], modifier: 0, total: 1,
      })
    }
    expect(useStore.getState().diceHistory).toHaveLength(20)
  })

  it('importState validates shape', () => {
    expect(() => useStore.getState().importState(null)).toThrow()
    expect(() => useStore.getState().importState({})).toThrow()
    useStore.getState().importState({ troopers: [], mission: null, diceHistory: [] })
    expect(useStore.getState().troopers).toEqual([])
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All store + game rules + dice tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/store tests/store.test.ts
git commit -m "feat: zustand store with persist + trooper/mission/dice actions"
```

---

## Task 4: App Shell and Navigation

**Files:**
- Create: `src/hooks/useMediaQuery.ts`
- Modify: `src/App.tsx`
- Create: stub views that Tasks 6/7/10/11 fill in — `src/views/Barracks/Barracks.tsx`, `src/views/MissionBoard/MissionBoard.tsx`, `src/views/Settings/Settings.tsx`, `src/views/DiceTray/DiceTray.tsx`

- [ ] **Step 1: Write `src/hooks/useMediaQuery.ts`**

```ts
import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}
```

- [ ] **Step 2: Create stub view files**

`src/views/Barracks/Barracks.tsx`:
```tsx
export default function Barracks() {
  return <div className="p-4"><div className="lbl">BARRACKS</div></div>
}
```

`src/views/MissionBoard/MissionBoard.tsx`:
```tsx
export default function MissionBoard() {
  return <div className="p-4"><div className="lbl">MISSION</div></div>
}
```

`src/views/Settings/Settings.tsx`:
```tsx
export default function Settings() {
  return <div className="p-4"><div className="lbl">SETTINGS</div></div>
}
```

`src/views/DiceTray/DiceTray.tsx`:
```tsx
import { useStore } from '../../store'
export default function DiceTray() {
  const close = () => useStore.getState().setDiceTrayOpen(false)
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={close}>
      <div className="bg-surface border border-border p-4 w-[min(90vw,480px)]" onClick={e => e.stopPropagation()}>
        <div className="lbl mb-2">DICE TRAY</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite `src/App.tsx` with sidebar + bottom tabs + view switch**

```tsx
import { useStore } from './store'
import { useMediaQuery } from './hooks/useMediaQuery'
import Barracks from './views/Barracks/Barracks'
import MissionBoard from './views/MissionBoard/MissionBoard'
import Settings from './views/Settings/Settings'
import DiceTray from './views/DiceTray/DiceTray'

const NAV = [
  { id: 'barracks', label: 'BKS', glyph: '⊞', title: 'Barracks' },
  { id: 'mission', label: 'MSN', glyph: '◈', title: 'Mission' },
  { id: 'settings', label: 'SET', glyph: '⚙', title: 'Settings' },
] as const

export default function App() {
  const view = useStore(s => s.currentView)
  const setView = useStore(s => s.setView)
  const diceOpen = useStore(s => s.diceTrayOpen)
  const setDice = useStore(s => s.setDiceTrayOpen)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const CurrentView = view === 'barracks' ? Barracks : view === 'mission' ? MissionBoard : Settings

  return (
    <div className="min-h-screen bg-bg text-ink font-mono flex">
      {isDesktop && (
        <aside className="w-14 bg-surface border-r border-border flex flex-col items-stretch py-3 flex-shrink-0">
          <div className="text-ok text-center text-[10px] tracking-[0.1em] pb-2 mb-4 border-b border-border">DC</div>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`py-2 text-center border-l-2 ${view === n.id ? 'border-ok text-ok' : 'border-transparent text-muted'} hover:text-ink`}>
              <div className="text-base leading-none">{n.glyph}</div>
              <div className="text-[9px] mt-1">{n.label}</div>
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => setDice(true)} className="py-2 text-center text-warn border-t border-border mt-2">
            <div className="text-lg leading-none">⬡</div>
            <div className="text-[9px] mt-1">DICE</div>
          </button>
        </aside>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        {!isDesktop && (
          <header className="flex items-center justify-between bg-surface border-b border-border px-3 py-2">
            <div className="lbl">{NAV.find(n => n.id === view)?.title.toUpperCase()}</div>
            <button onClick={() => setDice(true)} className="text-warn text-lg leading-none">⬡</button>
          </header>
        )}
        <div className="flex-1 overflow-auto">
          <CurrentView />
        </div>
        {!isDesktop && (
          <nav className="flex bg-surface border-t border-border">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setView(n.id)}
                className={`flex-1 py-2 text-center ${view === n.id ? 'text-ok' : 'text-muted'}`}>
                <div className="text-base leading-none">{n.glyph}</div>
                <div className="text-[9px] mt-1">{n.label}</div>
              </button>
            ))}
          </nav>
        )}
      </main>

      {diceOpen && <DiceTray />}
    </div>
  )
}
```

- [ ] **Step 4: Verify dev build**

Run: `npm run dev`
Expected: Sidebar visible on wide viewport; clicking nav items switches placeholder views; Dice button opens a placeholder dice modal. Resize narrow — bottom tabs appear.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/hooks src/views
git commit -m "feat: app shell with responsive sidebar/bottom-nav + view switch"
```

---

## Task 5: Shared Component Library

**Files:**
- Create: `src/components/PipTracker.tsx`, `src/components/Dropdown.tsx`, `src/components/Modal.tsx`, `src/components/ConfirmDialog.tsx`, `src/components/GearPopover.tsx`, `src/components/StatusBadge.tsx`, `src/components/Stepper.tsx`

- [ ] **Step 1: Write `src/components/PipTracker.tsx`**

```tsx
interface Props {
  value: number
  max: number
  onChange: (v: number) => void
  label?: string
  size?: number
  color?: string
}

export default function PipTracker({ value, max, onChange, label, size = 10, color = '#5a9e6e' }: Props) {
  const pips = Array.from({ length: max }, (_, i) => i < value)
  const toggle = (i: number) => {
    // Click pip at index i sets value to i+1; clicking the highest filled pip decrements.
    const next = (i + 1 === value) ? i : i + 1
    onChange(Math.max(0, Math.min(max, next)))
  }
  return (
    <div>
      {label && <div className="lbl mb-1 text-[10px]">{label}</div>}
      <div className="flex gap-1">
        {pips.map((filled, i) => (
          <button key={i} onClick={() => toggle(i)}
            aria-label={`${label ?? 'pip'} ${i + 1}`}
            style={{
              width: size, height: size,
              background: filled ? color : 'transparent',
              borderRadius: '50%',
              border: `1px solid ${filled ? color : '#3a4a3a'}`,
            }} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/Dropdown.tsx`**

```tsx
interface Option { value: string; label: string; disabled?: boolean }
interface Props {
  value: string
  options: Option[]
  onChange: (v: string) => void
  label?: string
  className?: string
}

export default function Dropdown({ value, options, onChange, label, className }: Props) {
  return (
    <div className={className}>
      {label && <div className="lbl mb-1 text-[10px]">{label}</div>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-bg border border-border text-ink font-mono text-xs px-2 py-1"
      >
        {options.map(o => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/Modal.tsx`**

```tsx
import { ReactNode, useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  width?: string
}

export default function Modal({ open, onClose, children, title, width = 'min(90vw, 560px)' }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-border flex flex-col max-h-[90vh]"
        style={{ width }}
        onClick={e => e.stopPropagation()}>
        {title && (
          <div className="lbl px-4 py-3 border-b border-border">{title}</div>
        )}
        <div className="overflow-auto p-4">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/ConfirmDialog.tsx`**

```tsx
import Modal from './Modal'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  tone?: 'default' | 'danger'
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'CONFIRM', cancelLabel = 'CANCEL',
  onConfirm, onCancel, tone = 'default',
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title} width="min(90vw, 380px)">
      <div className="text-xs text-ink mb-4">{message}</div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1 text-xs text-muted border border-border">
          {cancelLabel}
        </button>
        <button onClick={onConfirm}
          className={`px-3 py-1 text-xs border ${tone === 'danger' ? 'text-bad border-bad' : 'text-warn border-warn'}`}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 5: Write `src/components/GearPopover.tsx`**

```tsx
import { useState, useRef, useEffect } from 'react'
import type { GearItem } from '../types'

interface Props {
  gear: GearItem | undefined
  children: React.ReactNode
}

export default function GearPopover({ gear, children }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])
  if (!gear) return <>{children}</>
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)} className="text-left">{children}</button>
      {open && (
        <div className="absolute z-30 bottom-full mb-1 left-0 w-64 bg-surface border border-border p-2 shadow-lg">
          <div className="lbl mb-1">{gear.name}</div>
          <div className="text-[10px] text-muted leading-snug whitespace-pre-line">{gear.properties}</div>
          <div className="text-[10px] text-muted mt-2">MOB {gear.mobility_cost} · REQ {gear.reqcost}{gear.max_uses > 0 ? ` · USES ${gear.max_uses}` : ''}</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Write `src/components/StatusBadge.tsx`**

```tsx
import type { TrooperStatus } from '../types'

const COLOR: Record<TrooperStatus, string> = {
  ok: '#5a9e6e',
  grazed: '#c8a030',
  wounded: '#d45f27',
  bleedingout: '#c93535',
  dead: '#687868',
}

const LABEL: Record<TrooperStatus, string> = {
  ok: 'OK', grazed: 'GRAZED', wounded: 'WOUNDED', bleedingout: 'BLEEDING', dead: 'DEAD',
}

export default function StatusBadge({ status }: { status: TrooperStatus }) {
  return (
    <span className="text-[10px] tracking-wider" style={{ color: COLOR[status] }}>
      {LABEL[status]}
    </span>
  )
}

export const STATUS_COLOR = COLOR
export const STATUS_LABEL = LABEL
```

- [ ] **Step 7: Write `src/components/Stepper.tsx`**

```tsx
interface Props {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  label?: string
}

export default function Stepper({ value, onChange, min = -99, max = 99, label }: Props) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  return (
    <div className="flex items-center gap-2">
      {label && <div className="lbl text-[10px]">{label}</div>}
      <button onClick={() => onChange(clamp(value - 1))} className="text-muted text-sm w-5">−</button>
      <div className="bg-bg border border-border px-3 py-0.5 text-xs text-ink min-w-[32px] text-center">{value}</div>
      <button onClick={() => onChange(clamp(value + 1))} className="text-muted text-sm w-5">+</button>
    </div>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add src/components
git commit -m "feat: shared UI primitives (pips, dropdown, modal, confirm, popover, badge, stepper)"
```

---

## Task 6: Barracks View (Roster + Trooper Editor)

**Files:**
- Modify: `src/views/Barracks/Barracks.tsx`
- Create: `src/views/Barracks/TrooperCard.tsx`, `src/views/Barracks/TrooperEditor.tsx`

- [ ] **Step 1: Write `src/views/Barracks/TrooperCard.tsx`**

```tsx
import type { Trooper } from '../../types'

interface Props {
  trooper: Trooper
  onClick: () => void
}

export default function TrooperCard({ trooper, onClick }: Props) {
  return (
    <button onClick={onClick}
      className={`text-left bg-surface border border-border p-3 flex flex-col gap-1 ${trooper.active ? '' : 'opacity-50'}`}>
      <div className="flex items-baseline justify-between">
        <div className="text-ok text-xs tracking-wider">{trooper.name.toUpperCase()}</div>
        <div className="text-[10px] text-muted">{trooper.callsign}</div>
      </div>
      <div className="text-[10px] text-muted">{trooper.fullname}</div>
      <div className="text-[10px] text-ink mt-2">{trooper.armor || '—'}</div>
      <div className="text-[10px] text-ink">{trooper.weapon || '—'}</div>
      {trooper.special_weapon && <div className="text-[10px] text-muted">SW: {trooper.special_weapon}</div>}
      {trooper.special_gear && <div className="text-[10px] text-muted">SG: {trooper.special_gear}</div>}
      <div className="flex justify-between mt-2 text-[10px] text-muted">
        <span>MOB {trooper.mobility}</span>
        <span>PERK {trooper.perkpoints}</span>
        {!trooper.active && <span className="text-bad">INACTIVE</span>}
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Write `src/views/Barracks/TrooperEditor.tsx`**

```tsx
import { useMemo, useState, useEffect } from 'react'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import Dropdown from '../../components/Dropdown'
import { GEAR, gearByName, gearByType } from '../../data/gear'
import { baseMobilityFromCosts } from '../../utils/gameRules'
import type { Trooper } from '../../types'
import { useStore } from '../../store'

interface Props {
  open: boolean
  trooperId: string | null   // null = create mode
  onClose: () => void
}

const EMPTY: Omit<Trooper, 'id'> = {
  name: '', fullname: '', callsign: '', active: true, perkpoints: 0,
  mobility: 5, armor: 'Medium Armor', weapon: 'Assault Rifle',
  special_weapon: '', special_gear: '', perk: '', notes: '',
  grit: 3, ammo: 3, status: 'ok', offpos: 'engaged', defpos: 'incover',
  suppressed: false, def_modifier: 0, special_weapon_uses: -1, special_gear_uses: -1,
}

function optionsFor(type: 'weapon' | 'specialweapon' | 'specialequipment' | 'armor', includeNone = false) {
  const base = includeNone ? [{ value: '', label: '— None —' }] : []
  return base.concat(gearByType(type).map(g => ({
    value: g.name,
    label: `${g.name} · MOB ${g.mobility_cost} · REQ ${g.reqcost}${g.max_uses > 0 ? ` · USES ${g.max_uses}` : ''}`,
  })))
}

export default function TrooperEditor({ open, trooperId, onClose }: Props) {
  const existing = useStore(s => trooperId ? s.troopers.find(t => t.id === trooperId) : undefined)
  const addTrooper = useStore(s => s.addTrooper)
  const updateTrooper = useStore(s => s.updateTrooper)
  const deleteTrooper = useStore(s => s.deleteTrooper)

  const [form, setForm] = useState<Omit<Trooper, 'id'>>(EMPTY)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open) setForm(existing ? { ...existing } : EMPTY)
  }, [open, existing])

  const computedMob = useMemo(() => {
    const costs = [
      gearByName(form.armor)?.mobility_cost ?? 0,
      gearByName(form.weapon)?.mobility_cost ?? 0,
      form.special_weapon ? (gearByName(form.special_weapon)?.mobility_cost ?? 0) : 0,
      form.special_gear ? (gearByName(form.special_gear)?.mobility_cost ?? 0) : 0,
    ]
    return Math.max(0, baseMobilityFromCosts(costs))
  }, [form.armor, form.weapon, form.special_weapon, form.special_gear])

  const save = () => {
    const payload = { ...form, mobility: computedMob }
    if (trooperId) updateTrooper(trooperId, payload)
    else addTrooper(payload)
    onClose()
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const armorGear = gearByName(form.armor)
  const weaponGear = gearByName(form.weapon)
  const swGear = gearByName(form.special_weapon)
  const sgGear = gearByName(form.special_gear)

  return (
    <>
      <Modal open={open} onClose={onClose} title={trooperId ? 'EDIT TROOPER' : 'NEW TROOPER'}>
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-1">
            <div className="lbl text-[10px] mb-1">NAME</div>
            <input className="w-full bg-bg border border-border text-ink text-xs px-2 py-1 font-mono" value={form.name} onChange={e => set('name', e.target.value)} />
          </label>
          <label className="col-span-1">
            <div className="lbl text-[10px] mb-1">CALLSIGN</div>
            <input className="w-full bg-bg border border-border text-ink text-xs px-2 py-1 font-mono" value={form.callsign} onChange={e => set('callsign', e.target.value)} />
          </label>
          <label className="col-span-2">
            <div className="lbl text-[10px] mb-1">FULL NAME</div>
            <input className="w-full bg-bg border border-border text-ink text-xs px-2 py-1 font-mono" value={form.fullname} onChange={e => set('fullname', e.target.value)} />
          </label>

          <label className="col-span-1 flex items-center gap-2 mt-2">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
            <span className="lbl text-[10px]">ACTIVE</span>
          </label>
          <label className="col-span-1">
            <div className="lbl text-[10px] mb-1">PERK POINTS</div>
            <input type="number" className="w-full bg-bg border border-border text-ink text-xs px-2 py-1 font-mono" value={form.perkpoints} onChange={e => set('perkpoints', Number(e.target.value))} />
          </label>

          <div className="col-span-2 border-t border-border my-2" />

          <Dropdown className="col-span-2" label="ARMOR" value={form.armor} options={optionsFor('armor')} onChange={v => set('armor', v)} />
          {armorGear && <div className="col-span-2 text-[10px] text-muted -mt-1">{armorGear.properties}</div>}

          <Dropdown className="col-span-2" label="WEAPON" value={form.weapon} options={optionsFor('weapon')} onChange={v => set('weapon', v)} />
          {weaponGear && <div className="col-span-2 text-[10px] text-muted -mt-1">{weaponGear.properties}</div>}

          <Dropdown className="col-span-2" label="SPECIAL WEAPON" value={form.special_weapon} options={optionsFor('specialweapon', true)} onChange={v => set('special_weapon', v)} />
          {swGear && <div className="col-span-2 text-[10px] text-muted -mt-1">{swGear.properties}</div>}

          <Dropdown className="col-span-2" label="SPECIAL GEAR" value={form.special_gear} options={optionsFor('specialequipment', true)} onChange={v => set('special_gear', v)} />
          {sgGear && <div className="col-span-2 text-[10px] text-muted -mt-1">{sgGear.properties}</div>}

          <div className="col-span-2 flex items-center justify-between border-t border-border pt-2 mt-1">
            <div className="lbl text-[10px]">COMPUTED MOBILITY</div>
            <div className="text-ok text-sm">{computedMob}</div>
          </div>

          <label className="col-span-2">
            <div className="lbl text-[10px] mb-1">PERK</div>
            <input className="w-full bg-bg border border-border text-ink text-xs px-2 py-1 font-mono" value={form.perk} onChange={e => set('perk', e.target.value)} />
          </label>
          <label className="col-span-2">
            <div className="lbl text-[10px] mb-1">NOTES</div>
            <textarea rows={3} className="w-full bg-bg border border-border text-ink text-xs px-2 py-1 font-mono" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </label>
        </div>

        <div className="flex justify-between mt-4 pt-3 border-t border-border">
          {trooperId ? (
            <button onClick={() => setConfirmDelete(true)} className="text-[11px] text-bad border border-bad px-3 py-1">DELETE</button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-[11px] text-muted border border-border px-3 py-1">CANCEL</button>
            <button onClick={save} className="text-[11px] text-ok border border-ok px-3 py-1">SAVE</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="DELETE TROOPER"
        message={`Permanently delete ${form.name || 'this trooper'}?`}
        confirmLabel="DELETE"
        tone="danger"
        onConfirm={() => { if (trooperId) deleteTrooper(trooperId); setConfirmDelete(false); onClose() }}
        onCancel={() => setConfirmDelete(false)}
      />
      {void GEAR}
    </>
  )
}
```

- [ ] **Step 3: Rewrite `src/views/Barracks/Barracks.tsx`**

```tsx
import { useState } from 'react'
import { useStore } from '../../store'
import TrooperCard from './TrooperCard'
import TrooperEditor from './TrooperEditor'
import ConfirmDialog from '../../components/ConfirmDialog'

export default function Barracks() {
  const troopers = useStore(s => s.troopers)
  const prepareMission = useStore(s => s.prepareMission)
  const setView = useStore(s => s.setView)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorId, setEditorId] = useState<string | null>(null)
  const [confirmPrep, setConfirmPrep] = useState(false)

  const openNew = () => { setEditorId(null); setEditorOpen(true) }
  const openEdit = (id: string) => { setEditorId(id); setEditorOpen(true) }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="lbl">BARRACKS</div>
        <div className="flex gap-2">
          <button onClick={openNew} className="text-[11px] text-ok border border-ok px-3 py-1">+ TROOPER</button>
          <button onClick={() => setConfirmPrep(true)}
            disabled={troopers.filter(t => t.active).length === 0}
            className="text-[11px] text-warn border border-warn px-3 py-1 disabled:opacity-40">
            PREPARE FOR MISSION
          </button>
        </div>
      </div>

      {troopers.length === 0 ? (
        <div className="text-[11px] text-muted italic">No troopers yet. Add one to get started.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {troopers.map(t => <TrooperCard key={t.id} trooper={t} onClick={() => openEdit(t.id)} />)}
        </div>
      )}

      <TrooperEditor open={editorOpen} trooperId={editorId} onClose={() => setEditorOpen(false)} />

      <ConfirmDialog
        open={confirmPrep}
        title="PREPARE FOR MISSION"
        message="Reset all active troopers' mission-state fields (grit, ammo, status, positions, uses)?"
        confirmLabel="PREPARE"
        onConfirm={() => { prepareMission(); setConfirmPrep(false); setView('mission') }}
        onCancel={() => setConfirmPrep(false)}
      />
    </div>
  )
}
```

- [ ] **Step 4: Verify in dev**

Run: `npm run dev`
Expected: Barracks shows empty state. `+ TROOPER` opens editor. Create one — appears in grid. Clicking opens editor. Change gear — MOB recomputes live. Save returns to grid. `PREPARE FOR MISSION` confirms, then switches to Mission view.

- [ ] **Step 5: Commit**

```bash
git add src/views/Barracks
git commit -m "feat: barracks roster with trooper editor and prepare-for-mission flow"
```

---

## Task 7: Mission Board Layout + Sector/Momentum Panel

**Files:**
- Modify: `src/views/MissionBoard/MissionBoard.tsx`
- Create: `src/views/MissionBoard/SectorMomentumPanel.tsx`, `src/views/MissionBoard/MissionNotes.tsx`

- [ ] **Step 1: Write `src/views/MissionBoard/SectorMomentumPanel.tsx`**

```tsx
import Dropdown from '../../components/Dropdown'
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
```

- [ ] **Step 2: Write `src/views/MissionBoard/MissionNotes.tsx`**

```tsx
import { useState } from 'react'
import { useStore } from '../../store'

export default function MissionNotes() {
  const mission = useStore(s => s.mission)
  const setMission = useStore(s => s.setMission)
  const [open, setOpen] = useState(false)
  if (!mission) return null
  return (
    <div className="bg-surface border border-border">
      <button onClick={() => setOpen(o => !o)} className="w-full flex justify-between items-center px-3 py-2">
        <span className="lbl">MISSION NOTES</span>
        <span className="text-[10px] text-muted">{open ? '▴ COLLAPSE' : '▾ EXPAND'}</span>
      </button>
      {open && (
        <div className="p-3 border-t border-border">
          <textarea rows={4} className="w-full bg-bg border border-border text-ink text-xs p-2 font-mono"
            value={mission.notes} onChange={e => setMission({ notes: e.target.value })} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Rewrite `src/views/MissionBoard/MissionBoard.tsx`**

(Full panels will be added in Tasks 8–9. Dock placeholder for now.)

```tsx
import { useStore } from '../../store'
import SectorMomentumPanel from './SectorMomentumPanel'
import MissionNotes from './MissionNotes'

export default function MissionBoard() {
  const mission = useStore(s => s.mission)
  const prepareMission = useStore(s => s.prepareMission)

  if (!mission) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3">
        <div className="lbl">NO ACTIVE MISSION</div>
        <div className="text-[11px] text-muted">Initialise a mission from the Barracks (Prepare for Mission) or start a blank one now.</div>
        <button onClick={prepareMission} className="text-[11px] text-warn border border-warn px-3 py-1">START MISSION</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-3 flex flex-col gap-3 pb-[260px]">
        {/* AdvanceRollPanel slot — Task 9 */}
        <div className="bg-surface border border-border p-3 lbl">ADVANCE ROLL (wip)</div>
        <SectorMomentumPanel />
        <MissionNotes />
      </div>
      {/* TrooperCardDock slot — Task 8 */}
      <div className="sticky bottom-0 bg-surface border-t border-border p-3 lbl">TROOPER DOCK (wip)</div>
    </div>
  )
}
```

- [ ] **Step 4: Verify in dev**

Run: `npm run dev`
Expected: Mission view shows placeholder board + working Sector & Momentum card (dropdowns + momentum ◀ ▶) + collapsible notes. Momentum clamps −3..+3.

- [ ] **Step 5: Commit**

```bash
git add src/views/MissionBoard
git commit -m "feat: mission board skeleton with sector/momentum panel + notes"
```

---

## Task 8: Trooper Card Dock (Raised Sticky Dock)

**Files:**
- Create: `src/views/MissionBoard/TrooperCardDock.tsx`, `src/views/MissionBoard/TrooperMissionCard.tsx`
- Modify: `src/views/MissionBoard/MissionBoard.tsx`

- [ ] **Step 1: Write `src/views/MissionBoard/TrooperMissionCard.tsx`**

```tsx
import Dropdown from '../../components/Dropdown'
import PipTracker from '../../components/PipTracker'
import Stepper from '../../components/Stepper'
import GearPopover from '../../components/GearPopover'
import { STATUS_COLOR } from '../../components/StatusBadge'
import { gearByName } from '../../data/gear'
import {
  effectiveMobility, flankingBonus, canSetDefpos, canSetOffpos, clampUses,
} from '../../utils/gameRules'
import { useStore } from '../../store'
import type {
  Trooper, TrooperStatus, OffensivePosition, DefensivePosition,
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

export default function TrooperMissionCard({ trooper, squad, cover, space }: Props) {
  const updateTrooper = useStore(s => s.updateTrooper)
  const effMob = effectiveMobility(trooper)
  const flk = flankingBonus(effMob)
  const color = STATUS_COLOR[trooper.status]

  const armor = gearByName(trooper.armor)
  const weapon = gearByName(trooper.weapon)
  const sw = gearByName(trooper.special_weapon)
  const sg = gearByName(trooper.special_gear)

  const offOpts = OFFPOS.map(o => ({
    ...o,
    disabled: o.value !== trooper.offpos && !canSetOffpos(trooper, o.value, squad, space),
  }))
  const defOpts = DEFPOS.map(o => ({
    ...o,
    disabled: o.value !== trooper.defpos && !canSetDefpos(trooper, o.value, squad, cover),
  }))

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
          <PipTracker label="GRIT" value={trooper.grit} max={3}
            onChange={v => updateTrooper(trooper.id, { grit: v })} />
          <PipTracker label="AMMO" value={trooper.ammo} max={3}
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
            <div className="flex items-center justify-between">
              <GearPopover gear={sw}><div>{sw.name.toUpperCase()}</div></GearPopover>
              {sw.max_uses > 0 && (
                <PipTracker value={trooper.special_weapon_uses < 0 ? 0 : trooper.special_weapon_uses}
                  max={sw.max_uses}
                  onChange={v => updateTrooper(trooper.id, { special_weapon_uses: clampUses(v, sw.max_uses) })}
                  size={8} color="#c8a030" />
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

        <div className="flex justify-between text-[10px] border-t border-border pt-1">
          <span className={effMob < trooper.mobility ? 'text-wound' : 'text-ink'}>MOB {effMob}</span>
          <span className="text-ok">FLK +{flk}</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/views/MissionBoard/TrooperCardDock.tsx`**

```tsx
import { useStore } from '../../store'
import TrooperMissionCard from './TrooperMissionCard'

export default function TrooperCardDock() {
  const troopers = useStore(s => s.troopers.filter(t => t.active))
  const mission = useStore(s => s.mission)
  if (!mission) return null

  return (
    <div className="sticky bottom-0 left-0 right-0 z-20 pointer-events-none">
      {/* Gradient fade behind cards */}
      <div aria-hidden className="absolute -top-10 left-0 right-0 h-10"
        style={{ background: 'linear-gradient(to top, #0e1210, transparent)' }} />
      <div className="relative pointer-events-auto"
        style={{ boxShadow: '0 -4px 12px rgba(0,0,0,0.5)' }}>
        <div className="bg-surface px-3 pt-2 pb-1 border-t border-border">
          <div className="lbl text-[9px] mb-1">TROOPERS</div>
          <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2">
            {troopers.length === 0 && (
              <div className="text-[10px] text-muted italic">No active troopers. Activate troopers in the Barracks.</div>
            )}
            {troopers.map(t => (
              <TrooperMissionCard key={t.id} trooper={t} squad={troopers}
                cover={mission.sector.cover} space={mission.sector.space} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Swap dock placeholder in `MissionBoard.tsx`**

Replace the `<div className="sticky bottom-0 ... TROOPER DOCK (wip)</div>` with:

```tsx
<TrooperCardDock />
```

Add the import at the top:
```tsx
import TrooperCardDock from './TrooperCardDock'
```

- [ ] **Step 4: Verify dock behaviour**

Run: `npm run dev`
Expected: Set up a few troopers in Barracks → Prepare for Mission → Mission view shows cards pinned to bottom with gradient + upward shadow; they scroll horizontally with snap when too many; position dropdowns disable disallowed options given Cover/Space.

- [ ] **Step 5: Commit**

```bash
git add src/views/MissionBoard
git commit -m "feat: raised trooper card dock with mission-state cards + constraints"
```

---

## Task 9: Advance Roll Panel (Full SRD Flow)

**Files:**
- Create: `src/views/MissionBoard/AdvanceRollPanel.tsx`, `src/views/MissionBoard/MobilityCheckPhase.tsx`
- Modify: `src/views/MissionBoard/MissionBoard.tsx`

- [ ] **Step 1: Write `src/views/MissionBoard/MobilityCheckPhase.tsx`**

```tsx
import { useState } from 'react'
import { rollDie } from '../../utils/dice'
import { effectiveMobility, mobilityCheck, offposFromCheck, infiltrationPicks } from '../../utils/gameRules'
import type { Trooper, AdvanceResult, OffensivePosition } from '../../types'

interface Check { roll: number | null; pass: boolean | null }

interface Props {
  troopers: Trooper[]
  result: AdvanceResult
  stealthWasActive: boolean
  onApply: (trooperOffpos: Record<string, OffensivePosition>) => void
  onCancel: () => void
}

export default function MobilityCheckPhase({ troopers, result, stealthWasActive, onApply, onCancel }: Props) {
  const [checks, setChecks] = useState<Record<string, Check>>(
    () => Object.fromEntries(troopers.map(t => [t.id, { roll: null, pass: null }])),
  )

  const allRolled = troopers.every(t => checks[t.id].roll !== null)
  const passCount = troopers.filter(t => checks[t.id].pass === true).length
  const allPass = allRolled && passCount === troopers.length && troopers.length > 0
  const picks = infiltrationPicks(passCount, stealthWasActive)

  const rollOne = (t: Trooper) => {
    const r = rollDie(6)
    const pass = mobilityCheck(effectiveMobility(t), r)
    setChecks(c => ({ ...c, [t.id]: { roll: r, pass } }))
  }

  const apply = () => {
    const mapping: Record<string, OffensivePosition> = {}
    for (const t of troopers) {
      const c = checks[t.id]
      if (c.roll === null) continue
      mapping[t.id] = offposFromCheck(result, !!c.pass)
    }
    onApply(mapping)
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="lbl mb-2">MOBILITY CHECKS — {result.toUpperCase()}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {troopers.map(t => {
          const c = checks[t.id]
          const effMob = effectiveMobility(t)
          return (
            <div key={t.id} className="bg-bg border border-border p-2 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-ok">{t.name.toUpperCase()}</div>
                <div className="text-[9px] text-muted">MOB {effMob}</div>
              </div>
              {c.roll === null ? (
                <button onClick={() => rollOne(t)} className="text-[10px] text-warn border border-warn px-2 py-1">ROLL 1D6</button>
              ) : (
                <div className="text-[10px]">
                  <span className="text-ink mr-2">{c.roll}</span>
                  <span className={c.pass ? 'text-ok' : 'text-bad'}>{c.pass ? 'PASS' : 'FAIL'}</span>
                  <button onClick={() => rollOne(t)} className="text-[9px] text-muted ml-2 underline">re-roll</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {allPass && (
        <div className="bg-bg border border-ok p-2 mt-3">
          <div className="text-[11px] text-ok">SECTOR BYPASSED</div>
          <div className="text-[10px] text-muted">All troopers passed. No engagement this sector.</div>
          {picks > 0 && (
            <div className="text-[10px] text-warn mt-1">Stealth Infiltration: choose {picks} of Cut Comms / Target Commanders / Trap / Exit Route.</div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-3">
        <button onClick={onCancel} className="text-[10px] text-muted border border-border px-3 py-1">CANCEL</button>
        <button disabled={!allRolled} onClick={apply}
          className="text-[10px] text-ok border border-ok px-3 py-1 disabled:opacity-40">
          APPLY RESULT
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/views/MissionBoard/AdvanceRollPanel.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import {
  advanceModifier, advanceResult, woundCount,
} from '../../utils/gameRules'
import { rollDice } from '../../utils/dice'
import { newId } from '../../utils/id'
import MobilityCheckPhase from './MobilityCheckPhase'
import type { AdvanceResult, OffensivePosition } from '../../types'

type Phase =
  | { kind: 'setup' }
  | { kind: 'rolled'; total: number; result: AdvanceResult; dice: number[] }
  | { kind: 'mobility'; result: AdvanceResult; stealthWasActive: boolean }

export default function AdvanceRollPanel() {
  const mission = useStore(s => s.mission)!
  const troopers = useStore(s => s.troopers)
  const setMission = useStore(s => s.setMission)
  const applyAdvanceResult = useStore(s => s.applyAdvanceResult)
  const addRoll = useStore(s => s.addRoll)

  const [assaultAmmo, setAssaultAmmo] = useState(0)
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' })
  const [showTable, setShowTable] = useState(false)

  const activeTroopers = useMemo(() => troopers.filter(t => t.active), [troopers])
  const wounds = useMemo(() => woundCount(troopers), [troopers])

  const mod = advanceModifier({
    advanceRolls: mission.advance_rolls,
    wounds,
    weather: mission.sector.weather,
    tl: mission.sector.tl,
    stealth: mission.stealth,
    assaultAmmo,
  })

  const setStealth = (v: boolean) => setMission({ stealth: v })

  const roll = () => {
    const dice = rollDice(2, 6)
    const total = dice[0] + dice[1] + mod.total
    const result = advanceResult(total)
    addRoll({
      id: newId(), timestamp: Date.now(), label: 'Advance Roll',
      dice: '2d6', results: dice, modifier: mod.total, total,
    })
    setPhase({ kind: 'rolled', total, result, dice })
  }

  const proceedToMobility = () => {
    if (phase.kind !== 'rolled') return
    if (phase.result === 'overwhelm') {
      // No engagement; just bump advance_rolls and clear stealth if appropriate
      applyAdvanceResult({ result: 'overwhelm' })
      setPhase({ kind: 'setup' })
      setAssaultAmmo(0)
      return
    }
    setPhase({
      kind: 'mobility',
      result: phase.result,
      stealthWasActive: mission.stealth,
    })
  }

  const onApplyMobility = (mapping: Record<string, OffensivePosition>) => {
    if (phase.kind !== 'mobility') return
    applyAdvanceResult({ result: phase.result, trooperOffpos: mapping })
    setPhase({ kind: 'setup' })
    setAssaultAmmo(0)
  }

  const onAssaultChange = (v: number) => {
    const clamped = Math.max(0, v)
    setAssaultAmmo(clamped)
    if (clamped > 0 && mission.stealth) setMission({ stealth: false })
  }

  return (
    <div className="bg-surface border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="lbl">ADVANCE ROLL</div>
        <button onClick={() => setShowTable(s => !s)} className="text-[10px] text-muted">
          {showTable ? '▴ HIDE' : '▾ RESULT TABLE'}
        </button>
      </div>

      {phase.kind === 'setup' && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="lbl text-[10px]">ROLLS</span>
              <button onClick={() => setMission({ advance_rolls: Math.max(0, mission.advance_rolls - 1) })} className="text-muted">−</button>
              <div className="bg-bg border border-border px-3 py-0.5 text-xs">{mission.advance_rolls}</div>
              <button onClick={() => setMission({ advance_rolls: mission.advance_rolls + 1 })} className="text-muted">+</button>
            </div>
            <label className="flex items-center gap-1 text-[10px] text-muted">
              <input type="checkbox" checked={mission.stealth} disabled={assaultAmmo > 0}
                onChange={e => setStealth(e.target.checked)} />
              STEALTH {mission.stealth && <span className="text-ok ml-1">ACTIVE</span>}
            </label>
            <label className="flex items-center gap-1 text-[10px] text-muted">
              ASSAULT:
              <input type="number" min={0} value={assaultAmmo}
                onChange={e => onAssaultChange(Number(e.target.value))}
                className="w-12 bg-bg border border-border text-ink px-2 py-0.5 font-mono" />
              ammo
            </label>
          </div>

          <div className="text-[10px] text-muted italic mb-2">
            Fatigue {mod.fatigue} · Wounds {mod.wounds} · Weather {mod.weather >= 0 ? `+${mod.weather}` : mod.weather}
            {' '}· TL {mod.tl} · Stealth {mod.stealth >= 0 ? `+${mod.stealth}` : mod.stealth}
            {' '}· Assault +{mod.assault} = <span className={mod.total < 0 ? 'text-bad' : 'text-ok'}>{mod.total >= 0 ? `+${mod.total}` : mod.total}</span>
          </div>

          <button onClick={roll} className="text-[11px] text-warn border border-warn px-3 py-1">ROLL 2D6 ▸</button>
        </>
      )}

      {phase.kind === 'rolled' && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] text-ink">
            ROLL: {phase.dice.join(' + ')} {mod.total >= 0 ? `+ ${mod.total}` : `− ${Math.abs(mod.total)}`} = <span className="text-ok">{phase.total}</span>
          </div>
          <div className="text-[12px] text-warn tracking-wider">{phase.result.toUpperCase()}</div>
          <div className="flex gap-2">
            <button onClick={() => setPhase({ kind: 'setup' })} className="text-[10px] text-muted border border-border px-3 py-1">REDO</button>
            <button onClick={proceedToMobility} className="text-[10px] text-ok border border-ok px-3 py-1">
              {phase.result === 'overwhelm' ? 'APPLY — NO ENGAGEMENT' : 'CONTINUE TO MOBILITY CHECKS'}
            </button>
          </div>
        </div>
      )}

      {phase.kind === 'mobility' && (
        <MobilityCheckPhase
          troopers={activeTroopers}
          result={phase.result}
          stealthWasActive={phase.stealthWasActive}
          onApply={onApplyMobility}
          onCancel={() => setPhase({ kind: 'setup' })}
        />
      )}

      {showTable && (
        <div className="mt-3 border-t border-border pt-2 text-[10px] text-muted">
          <div>≤3 · AMBUSHED — momentum −1, all Flanked. PASS = Engaged, FAIL = Limited.</div>
          <div>4–7 · SPOTTED — momentum 0, all In Cover. PASS = Flanking, FAIL = Engaged.</div>
          <div>8–10 · SURPRISE — momentum +1, all Fortified. PASS = Flanking, FAIL = Engaged.</div>
          <div>≥11 · OVERWHELM — no engagement; momentum unchanged.</div>
          <div className="mt-1">All PASS → Sector Bypassed. Stealth active → floor(passes/2) Infiltration picks.</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire `AdvanceRollPanel` into `MissionBoard.tsx`**

Replace the `<div ...>ADVANCE ROLL (wip)</div>` with `<AdvanceRollPanel />` and add the import:

```tsx
import AdvanceRollPanel from './AdvanceRollPanel'
```

- [ ] **Step 4: Verify full flow**

Run: `npm run dev`
Expected: With an active mission and squad, Advance Roll panel shows rolls counter, stealth toggle, assault input, live modifier breakdown. ROLL 2D6 populates a result. Continue to mobility → roll per trooper → APPLY RESULT updates trooper dock (defpos reflects result; offpos reflects each check; momentum shifts; `advance_rolls` increments; stealth clears on AMBUSHED/SPOTTED). OVERWHELM path skips mobility.

- [ ] **Step 5: Commit**

```bash
git add src/views/MissionBoard
git commit -m "feat: full advance roll flow with per-trooper mobility checks + infiltration"
```

---

## Task 10: Dice Tray Modal

**Files:**
- Modify: `src/views/DiceTray/DiceTray.tsx`
- Create: `src/views/DiceTray/DiceControls.tsx`, `src/views/DiceTray/MobilityCheckRoll.tsx`, `src/views/DiceTray/RollHistory.tsx`

- [ ] **Step 1: Write `src/views/DiceTray/DiceControls.tsx`**

```tsx
import { useState } from 'react'
import { useStore } from '../../store'
import { rollDice } from '../../utils/dice'
import { newId } from '../../utils/id'

const QUICK = [
  { label: '2D6', count: 2, sides: 6 },
  { label: '1D6', count: 1, sides: 6 },
  { label: 'D66', count: 2, sides: 6, tens: true },
]

export default function DiceControls() {
  const addRoll = useStore(s => s.addRoll)
  const [modifier, setModifier] = useState(0)
  const [label, setLabel] = useState('')
  const [last, setLast] = useState<{ results: number[]; total: number; dice: string; doubles: boolean } | null>(null)

  const doRoll = (q: typeof QUICK[number]) => {
    const results = rollDice(q.count, q.sides)
    const isD66 = !!(q as any).tens
    const sum = isD66 ? results[0] * 10 + results[1] : results.reduce((a, b) => a + b, 0)
    const total = sum + (isD66 ? 0 : modifier)
    const doubles = !isD66 && q.count === 2 && results[0] === results[1]
    setLast({ results, total, dice: q.label, doubles })
    addRoll({
      id: newId(), timestamp: Date.now(),
      label: label || q.label, dice: q.label.toLowerCase(),
      results, modifier: isD66 ? 0 : modifier, total,
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {QUICK.map(q => (
          <button key={q.label} onClick={() => doRoll(q)}
            className="text-[11px] text-warn border border-warn px-3 py-1">{q.label}</button>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <span className="lbl text-[10px]">MOD</span>
        <button onClick={() => setModifier(m => m - 1)} className="text-muted">−</button>
        <div className="bg-bg border border-border px-3 py-0.5 text-xs min-w-[32px] text-center">{modifier}</div>
        <button onClick={() => setModifier(m => m + 1)} className="text-muted">+</button>
        <input placeholder="label"
          className="flex-1 bg-bg border border-border text-ink text-xs px-2 py-0.5 font-mono"
          value={label} onChange={e => setLabel(e.target.value)} />
      </div>
      {last && (
        <div className="bg-bg border border-border p-2 text-xs">
          <span className="text-muted">{last.dice}</span>{' '}
          <span className="text-ink">{last.results.join(', ')}</span>
          {last.doubles && <span className="text-warn ml-2">DOUBLES</span>}
          <span className="ml-2 text-ok">= {last.total}</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write `src/views/DiceTray/MobilityCheckRoll.tsx`**

```tsx
import { useState } from 'react'
import { useStore } from '../../store'
import { rollDie } from '../../utils/dice'
import { effectiveMobility, mobilityCheck } from '../../utils/gameRules'
import { newId } from '../../utils/id'

export default function MobilityCheckRoll() {
  const troopers = useStore(s => s.troopers.filter(t => t.active))
  const addRoll = useStore(s => s.addRoll)
  const [results, setResults] = useState<Record<string, { roll: number; pass: boolean }>>({})

  const roll = (id: string, name: string, effMob: number) => {
    const r = rollDie(6)
    const pass = mobilityCheck(effMob, r)
    setResults(p => ({ ...p, [id]: { roll: r, pass } }))
    addRoll({
      id: newId(), timestamp: Date.now(),
      label: `${name} mobility check`, dice: '1d6',
      results: [r], modifier: 0, total: r,
    })
  }

  if (troopers.length === 0) {
    return <div className="text-[10px] text-muted italic">No active troopers.</div>
  }

  return (
    <div className="flex flex-col gap-1">
      {troopers.map(t => {
        const effMob = effectiveMobility(t)
        const r = results[t.id]
        return (
          <div key={t.id} className="flex items-center justify-between text-[11px]">
            <div>
              <span className="text-ok">{t.name.toUpperCase()}</span>
              <span className="text-muted ml-2">MOB {effMob}</span>
            </div>
            <div className="flex items-center gap-2">
              {r && (
                <span className="text-[10px]">
                  <span className="text-ink">{r.roll}</span>{' '}
                  <span className={r.pass ? 'text-ok' : 'text-bad'}>{r.pass ? 'PASS' : 'FAIL'}</span>
                </span>
              )}
              <button onClick={() => roll(t.id, t.name, effMob)}
                className="text-[10px] text-warn border border-warn px-2 py-0.5">ROLL</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/views/DiceTray/RollHistory.tsx`**

```tsx
import { useStore } from '../../store'

export default function RollHistory() {
  const history = useStore(s => s.diceHistory)
  const clear = useStore(s => s.clearHistory)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <div className="lbl text-[10px]">HISTORY</div>
        <button onClick={clear} className="text-[9px] text-muted underline">clear</button>
      </div>
      <div className="max-h-[140px] overflow-auto flex flex-col gap-0.5">
        {history.length === 0 && <div className="text-[10px] text-muted italic">No rolls yet.</div>}
        {history.map(r => (
          <div key={r.id} className="flex justify-between text-[10px] bg-bg border border-border px-2 py-0.5">
            <span className="text-muted">{r.label}</span>
            <span className="text-ink">{r.dice} → {r.results.join(',')}{r.modifier ? ` ${r.modifier > 0 ? '+' : ''}${r.modifier}` : ''} = {r.total}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rewrite `src/views/DiceTray/DiceTray.tsx`**

```tsx
import { useStore } from '../../store'
import DiceControls from './DiceControls'
import MobilityCheckRoll from './MobilityCheckRoll'
import RollHistory from './RollHistory'

export default function DiceTray() {
  const close = () => useStore.getState().setDiceTrayOpen(false)
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-0 md:p-4" onClick={close}>
      <div className="bg-surface border border-border w-full h-full md:w-[min(90vw,480px)] md:h-auto md:max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-4 py-3 border-b border-border">
          <div className="lbl">DICE TRAY</div>
          <button onClick={close} className="text-muted text-sm">×</button>
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
    </div>
  )
}
```

- [ ] **Step 5: Verify**

Run: `npm run dev`
Expected: Dice button opens modal; 2D6 / 1D6 / D66 buttons roll; doubles highlighted on 2d6; modifier applied; history updates; each active trooper has a roll button for Mobility Check; clear clears history. Mobile: modal is full-screen.

- [ ] **Step 6: Commit**

```bash
git add src/views/DiceTray
git commit -m "feat: dice tray with quick rolls, mobility checks, and history"
```

---

## Task 11: Settings View (Export / Import)

**Files:**
- Modify: `src/views/Settings/Settings.tsx`
- Create: `src/views/Settings/ExportImport.tsx`

- [ ] **Step 1: Write `src/views/Settings/ExportImport.tsx`**

```tsx
import { useRef, useState } from 'react'
import { useStore } from '../../store'
import ConfirmDialog from '../../components/ConfirmDialog'

export default function ExportImport() {
  const exportState = useStore(s => s.exportState)
  const importState = useStore(s => s.importState)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingRaw, setPendingRaw] = useState<unknown>(null)

  const doExport = () => {
    const data = { version: 1, exportedAt: new Date().toISOString(), ...exportState() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'danger-close-save.json'
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const text = await f.text()
      const raw = JSON.parse(text)
      setPendingRaw(raw)
    } catch (err) {
      setError('Could not parse JSON file.')
    } finally {
      e.target.value = ''
    }
  }

  const confirmImport = () => {
    try {
      importState(pendingRaw)
      setPendingRaw(null)
    } catch (err: any) {
      setError(err?.message ?? 'Invalid save file.')
      setPendingRaw(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button onClick={doExport} className="text-[11px] text-ok border border-ok px-3 py-1">EXPORT JSON</button>
        <button onClick={() => fileRef.current?.click()} className="text-[11px] text-warn border border-warn px-3 py-1">IMPORT JSON</button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onFile} />
      </div>
      {error && <div className="text-[10px] text-bad">{error}</div>}

      <ConfirmDialog
        open={pendingRaw !== null}
        title="OVERWRITE STATE"
        message="Importing will overwrite all current troopers, mission, and dice history. Continue?"
        confirmLabel="OVERWRITE"
        tone="danger"
        onConfirm={confirmImport}
        onCancel={() => setPendingRaw(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `src/views/Settings/Settings.tsx`**

```tsx
import ExportImport from './ExportImport'

export default function Settings() {
  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="lbl">SETTINGS</div>
      <section className="bg-surface border border-border p-3 flex flex-col gap-2">
        <div className="lbl text-[10px]">DATA</div>
        <ExportImport />
        <div className="text-[10px] text-muted italic">Saves persist automatically to your browser. Export to back up or move between devices.</div>
      </section>
      {/* Future: theme, dice prefs, reset options */}
    </div>
  )
}
```

- [ ] **Step 3: Verify**

Run: `npm run dev`
Expected: Settings view shows Export/Import buttons. Export downloads `danger-close-save.json`. Importing a valid file shows confirmation, then overwrites. Importing invalid JSON shows error message.

- [ ] **Step 4: Run full test suite + build**

Run: `npm test && npm run build`
Expected: all tests PASS, `dist/` builds successfully.

- [ ] **Step 5: Commit**

```bash
git add src/views/Settings
git commit -m "feat: settings view with export/import (validated overwrite flow)"
```

---

## Self-Review

**Spec coverage:**
- Trooper / GearItem / MissionState / AppState / ApplyAdvancePayload types → Task 2
- Full bundled gear catalogue (armor + 3 weapons + 8 special weapons + 7 special equipment) → Task 2 Step 9
- Zustand store with persist, partialize, version → Task 3
- Advance modifier formula, 4-row result table, mobility check offpos, flanking bonus, position constraints, clamps → Task 2 gameRules + tests
- App shell: desktop sidebar + mobile bottom tabs + Dice Tray → Task 4
- Shared components: PipTracker, Dropdown, Modal, ConfirmDialog, GearPopover, StatusBadge, Stepper → Task 5
- Barracks: grid + trooper editor with live MOB compute + Prepare for Mission confirmation → Task 6
- Mission Board: Sector/Momentum combined panel + Notes + dock slot → Task 7
- Raised Trooper Card Dock: sticky bottom, gradient fade, upward shadow, horizontal snap scroll → Task 8
- Trooper mission card: status/grit/ammo/offpos/defpos/suppressed/DEF modifier + gear popovers + uses pips + MOB/FLK → Task 8
- Advance Roll Panel: setup → roll → mobility phase → apply, with stealth + assault + infiltration + collapsible table → Task 9
- Dice Tray: quick rolls + modifier + label + mobility checks + history → Task 10
- Settings: export/import with validation + overwrite confirmation → Task 11
- Confirmations only on: prepare for mission, delete trooper, apply advance (via continue flow), import overwrite → covered
- Clamping, constraint-driven disabled options, colour palette, monospace — pervasive

**Placeholder scan:** none found — every step contains complete code or exact commands.

**Type consistency:** `ApplyAdvancePayload`, `OffensivePosition`, `DefensivePosition`, `AdvanceResult`, and all gear types match between `types.ts`, `gameRules.ts`, store actions, and consuming components. Method names used consistently: `addTrooper`, `updateTrooper`, `deleteTrooper`, `prepareMission`, `setMission`, `applyAdvanceResult`, `addRoll`, `clearHistory`, `setView`, `setDiceTrayOpen`, `importState`, `exportState`.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-04-19-danger-close-play-aid.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task with two-stage review between tasks. Best for a first build of this size.

**2. Inline Execution** — execute tasks in this session with checkpoints for review.

Which approach?

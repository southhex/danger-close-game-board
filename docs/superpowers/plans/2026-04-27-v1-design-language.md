# V1 Design Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the V1 "Level 3 Shell Polish" design language — oklch tokens, Inter/JetBrains Mono fonts, rounded corners, 160px labeled sidebar, polished trooper cards, and SVG dice with spin animation.

**Architecture:** Four sequential commits: tokens first (everything else depends on these), then shell, then cards, then dice tray. No game logic or store changes. No new tests — run existing 91 tests after dice tray to confirm no regressions.

**Spec:** `docs/superpowers/specs/2026-04-27-v1-design-language.md`  
**Dicebag reference:** `EXAMPLE - dicebag/main.js` and `EXAMPLE - dicebag/styles.css`

---

### Task 1: Design Tokens & Typography

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`
- Modify: `src/App.tsx` (remove `font-mono` from root div only)

- [ ] **Replace `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       'oklch(0.175 0.006 130)',
        surface:  'oklch(0.215 0.006 130)',
        surface2: 'oklch(0.255 0.006 130)',
        border:   'oklch(0.26  0.005 130)',
        ink:      'oklch(0.94  0.006 90)',
        'ink-dim':'oklch(0.78  0.006 90)',
        muted:    'oklch(0.62  0.006 100)',
        subtle:   'oklch(0.48  0.006 100)',
        accent:   'oklch(0.72  0.13  155)',
        ok:       'oklch(0.76  0.13  155)',
        grazed:   'oklch(0.82  0.13  90)',
        wounded:  'oklch(0.72  0.15  45)',
        bad:      'oklch(0.65  0.19  25)',
        dead:     'oklch(0.50  0.02  100)',
        warn:     'oklch(0.82  0.13  90)',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xs:   '4px',
        sm:   '6px',
        md:   '8px',
        lg:   '10px',
        xl:   '12px',
        '2xl':'14px',
        pill: '999px',
      },
    },
  },
  plugins: [],
}
```

Notes:
- `dockfade` removed — confirmed zero usages in `src/`.
- `neutral` **kept** — used in ~10 mission board files (MomentumStep, DefenseStep, OffenseStep, IntentStep) for "Engaged / In Cover / Hold" state display. Add it to the config: `neutral: 'oklch(0.62 0.006 100)'` (warm grey, replaces `#a0a090`).
- `wound` **kept** — used in `src/views/MissionBoard/TrooperDetailPanel.tsx:137` (out of scope for this task). Add: `wound: 'oklch(0.72 0.15 45)'` (same value as `wounded`).
- `warn` kept at same oklch amber value as `grazed` — 50+ usages in mission board stay working unchanged.
- `border` is now a single soft value; the two-level distinction in the spec is collapsed since the diff is imperceptible.

Updated final token block — add `neutral` and `wound` to the config above:
```js
neutral: 'oklch(0.62 0.006 100)',
wound:   'oklch(0.72 0.15 45)',
```

- [ ] **Replace `src/index.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
  margin: 0;
  background: oklch(0.175 0.006 130);
  color: oklch(0.94 0.006 90);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
}

button { font-family: inherit; }

.lbl {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: oklch(0.62 0.006 100);
  font-size: 10px;
  font-weight: 600;
}
```

- [ ] **In `src/App.tsx`**, remove `font-mono` from the root div's className (the body default is now Inter):

```tsx
<div className="h-screen overflow-hidden bg-bg text-ink flex" style={{ height: '100dvh' }}>
```

- [ ] **Visual check:** `npm run dev`, open app. Text should now render in Inter. Monospace values (any explicit `font-mono` classes) use JetBrains Mono.

- [ ] **Commit**
```bash
git add tailwind.config.js src/index.css src/App.tsx
git commit -m "feat: V1 design tokens — oklch palette, Inter + JetBrains Mono, radius scale"
```

---

### Task 2: App Shell

**Files:**
- Modify: `src/App.tsx`

- [ ] **Replace `src/App.tsx`**

```tsx
import { type ComponentType } from 'react'
import { ToastProvider } from './components'
import { useStore } from './store'
import { useMediaQuery } from './hooks/useMediaQuery'
import type { View } from './types'
import Barracks from './views/Barracks/Barracks'
import MissionBoard from './views/MissionBoard/MissionBoard'
import Settings from './views/Settings/Settings'
import DiceTray from './views/DiceTray/DiceTray'

const NAV = [
  { id: 'barracks', label: 'Barracks', glyph: '⊞' },
  { id: 'mission',  label: 'Mission',  glyph: '◈' },
  { id: 'dice',     label: 'Dice',     glyph: '⬡' },
  { id: 'settings', label: 'Settings', glyph: '⚙' },
] as const

type NavId = typeof NAV[number]['id']

export default function App() {
  const view        = useStore(s => s.currentView)
  const setView     = useStore(s => s.setView)
  const diceOpen    = useStore(s => s.diceTrayOpen)
  const setDice     = useStore(s => s.setDiceTrayOpen)
  const allTroopers = useStore(s => s.troopers)
  const mission     = useStore(s => s.mission)
  const isDesktop   = useMediaQuery('(min-width: 768px)')

  const activeTrooperCount = allTroopers.filter(t => t.active).length

  const VIEW_COMPONENTS: Record<Exclude<View, 'dice'>, ComponentType> = {
    barracks: Barracks,
    mission:  MissionBoard,
    settings: Settings,
  }

  const handleNav = (id: NavId) => {
    if (id === 'dice') { setDice(!diceOpen); return }
    setView(id as View)
  }

  const pageTitle = () => {
    if (view === 'barracks') return { title: 'Barracks', sub: `${activeTrooperCount} troopers` }
    if (view === 'mission')  return { title: 'Mission', sub: mission ? mission.name : 'No active mission' }
    return { title: 'Settings', sub: null }
  }
  const { title, sub } = pageTitle()
  const CurrentView = VIEW_COMPONENTS[view as Exclude<View, 'dice'>] ?? Barracks

  return (
    <ToastProvider>
      <div className="h-screen overflow-hidden bg-bg text-ink flex" style={{ height: '100dvh' }}>

        {/* Desktop sidebar */}
        {isDesktop && (
          <aside className="w-40 bg-surface border-r border-border flex flex-col py-4 px-3 flex-shrink-0">
            {/* Brand */}
            <div className="flex items-center gap-2.5 px-1.5 pb-4 mb-2 border-b border-border">
              <div className="w-[26px] h-[26px] rounded-md bg-accent text-bg flex items-center justify-center font-bold text-[11px] tracking-tight flex-shrink-0">
                DC
              </div>
              <div>
                <div className="text-[13px] font-semibold leading-tight">Danger Close</div>
                <div className="text-[10.5px] text-muted">Play aid</div>
              </div>
            </div>

            {/* Nav */}
            {NAV.map(n => {
              const isActive = n.id === 'dice' ? diceOpen : view === n.id
              return (
                <button key={n.id} onClick={() => handleNav(n.id)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-0.5 text-[13px] w-full text-left
                    ${isActive
                      ? 'bg-[color-mix(in_oklch,theme(colors.accent)_14%,transparent)] text-accent font-semibold'
                      : 'text-ink-dim font-medium hover:bg-surface2'
                    }`}>
                  <span className="text-base leading-none w-4 text-center">{n.glyph}</span>
                  <span className="flex-1">{n.label}</span>
                  {n.id === 'barracks' && (
                    <span className="text-[11px] text-subtle font-mono">{activeTrooperCount}</span>
                  )}
                  {n.id === 'mission' && mission && (
                    <span className="text-[9px] font-bold tracking-wide bg-accent text-bg px-1.5 py-0.5 rounded-xs">
                      LIVE
                    </span>
                  )}
                </button>
              )
            })}
          </aside>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <header className="flex items-center justify-between bg-bg border-b border-border px-5 py-2.5 flex-shrink-0">
            <div>
              <div className="text-[15px] font-bold leading-tight">{title}</div>
              {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
            </div>
            <button onClick={() => setDice(!diceOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[12px] font-medium
                ${diceOpen ? 'border-accent text-accent' : 'border-border text-ink-dim hover:text-ink'}`}>
              ⬡ Dice
            </button>
          </header>

          <div className="flex-1 overflow-auto">
            <CurrentView />
          </div>

          {/* Mobile bottom nav */}
          {!isDesktop && (
            <nav className="flex bg-surface border-t border-border">
              {NAV.map(n => {
                const isActive = n.id === 'dice' ? diceOpen : view === n.id
                return (
                  <button key={n.id} onClick={() => handleNav(n.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2
                      ${isActive ? 'text-accent font-semibold' : 'text-muted font-medium'}`}>
                    <span className="text-lg leading-none">{n.glyph}</span>
                    <span className="text-[10.5px]">{n.label}</span>
                  </button>
                )
              })}
            </nav>
          )}
        </main>

        {diceOpen && <DiceTray />}
      </div>
    </ToastProvider>
  )
}
```

Note: `View` type in `src/types.ts` currently has `'barracks' | 'mission' | 'settings'` — do not add `'dice'` to it; dice is handled separately via `diceOpen` state.

- [ ] **Visual check:** Sidebar shows 160px with brand mark and text labels. Active nav item gets emerald tint. Header shows title + subtitle. 4 mobile tabs on narrow viewport.

- [ ] **Commit**
```bash
git add src/App.tsx
git commit -m "feat: V1 shell — 160px labeled sidebar, title header, 4-tab mobile nav"
```

---

### Task 3: Component Polish

**Files:**
- Modify: `src/components/PipTracker.tsx`
- Modify: `src/components/StatusBadge.tsx`
- Modify: `src/views/Barracks/TrooperCard.tsx`
- Modify: `src/views/MissionBoard/TrooperMissionCard.tsx`

- [ ] **Replace `src/components/PipTracker.tsx`** — segmented bars instead of circles:

```tsx
interface Props {
  value: number
  max: number
  onChange: (v: number) => void
  label?: string
  color?: string
}

export default function PipTracker({ value, max, onChange, label, color = 'oklch(0.76 0.13 155)' }: Props) {
  const toggle = (i: number, filled: boolean) => {
    const next = filled ? i : i + 1
    onChange(Math.max(0, Math.min(max, next)))
  }
  return (
    <div>
      {label && <div className="lbl mb-1">{label}</div>}
      <div className="flex gap-[3px]">
        {Array.from({ length: max }, (_, i) => {
          const filled = i < value
          return (
            <button key={i} onClick={() => toggle(i, filled)}
              aria-label={`${label ?? 'pip'} ${i + 1}`}
              style={{
                width: 18, height: 6,
                borderRadius: 3,
                background: filled ? color : 'oklch(0.26 0.005 130)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }} />
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Replace `src/components/StatusBadge.tsx`** — pill with color-mix tint:

```tsx
import type { TrooperStatus } from '../types'

const COLOR: Record<TrooperStatus, string> = {
  ok:         'oklch(0.76 0.13 155)',
  grazed:     'oklch(0.82 0.13 90)',
  wounded:    'oklch(0.72 0.15 45)',
  bleedingout:'oklch(0.65 0.19 25)',
  dead:       'oklch(0.50 0.02 100)',
}

const LABEL: Record<TrooperStatus, string> = {
  ok: 'OK', grazed: 'GRAZED', wounded: 'WOUNDED', bleedingout: 'BLEEDING', dead: 'DEAD',
}

export default function StatusBadge({ status }: { status: TrooperStatus }) {
  const color = COLOR[status]
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
      padding: '3px 7px', borderRadius: 999,
      background: `color-mix(in oklch, ${color} 18%, transparent)`,
      color,
    }}>
      {LABEL[status]}
    </span>
  )
}

export const STATUS_COLOR = COLOR
export const STATUS_LABEL = LABEL
```

- [ ] **Replace `src/views/Barracks/TrooperCard.tsx`**:

```tsx
import { TextPopover } from '../../components'
import { tagByName } from '../../data/tags'
import type { Trooper, TrooperStatus } from '../../types'

const STATUS_COLOR: Record<TrooperStatus, string> = {
  ok: 'oklch(0.76 0.13 155)', grazed: 'oklch(0.82 0.13 90)',
  wounded: 'oklch(0.72 0.15 45)', bleedingout: 'oklch(0.65 0.19 25)',
  dead: 'oklch(0.50 0.02 100)',
}
const STATUS_LABEL: Record<TrooperStatus, string> = {
  ok: 'OK', grazed: 'GRAZED', wounded: 'WOUNDED', bleedingout: 'BLEEDING', dead: 'DEAD',
}

const FLANKING_BONUS = (mob: number) => mob <= 3 ? 1 : mob === 4 ? 2 : 3

interface Props { trooper: Trooper; onClick: () => void }

export default function TrooperCard({ trooper, onClick }: Props) {
  const tagData = trooper.tag ? tagByName(trooper.tag) : undefined
  const statusColor = STATUS_COLOR[trooper.status]
  const flk = FLANKING_BONUS(trooper.mobility)

  return (
    <button onClick={onClick}
      className={`text-left bg-surface border border-border rounded-xl overflow-hidden flex flex-col w-full
        ${trooper.active ? '' : 'opacity-45'}`}>
      {/* Status stripe */}
      <div style={{ height: 3, background: statusColor, width: '100%' }} />

      {/* Body */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[14px] font-semibold leading-tight">{trooper.name}</div>
            <div className="text-[11px] text-muted mt-0.5">
              {trooper.callsign}{trooper.tag ? ` · ${trooper.tag}` : ''}
            </div>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.3px', flexShrink: 0,
            padding: '3px 7px', borderRadius: 999,
            background: `color-mix(in oklch, ${statusColor} 18%, transparent)`,
            color: statusColor,
          }}>
            {STATUS_LABEL[trooper.status]}
          </span>
        </div>

        {/* Loadout */}
        <div className="flex flex-col gap-0.5">
          <div className="lbl text-[9.5px]">Loadout</div>
          <div className="text-[12px] text-ink-dim leading-snug">
            {[trooper.armor, trooper.weapon].filter(Boolean).join(' · ') || '—'}
          </div>
          {(trooper.special_weapon || trooper.special_gear) && (
            <div className="text-[11px] text-muted">
              {[trooper.special_weapon && `SW: ${trooper.special_weapon}`,
                trooper.special_gear  && `SG: ${trooper.special_gear}`]
                .filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {/* Perks / tags */}
        {(tagData || trooper.perks.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {tagData && (
              <TextPopover title={tagData.name} body={tagData.description}>
                <span className="text-[9px] font-semibold uppercase tracking-wide border border-border px-1.5 py-0.5 rounded-xs text-muted">
                  {tagData.name}
                </span>
              </TextPopover>
            )}
            {trooper.perks.map((perk, i) => (
              <TextPopover key={i} title={perk.name} body={perk.description || 'No description.'}>
                <span className="text-[9px] font-semibold uppercase tracking-wide border border-border px-1.5 py-0.5 rounded-xs text-muted">
                  {perk.name}
                </span>
              </TextPopover>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between border-t border-border px-3.5 py-2 font-mono text-[11px]">
        <span className="text-ink-dim">MOB {trooper.mobility}</span>
        <span className="text-accent">FLK +{flk}</span>
      </div>
    </button>
  )
}
```

Note: Barracks card is display-only (no pip trackers for grit/ammo — those are mission-state fields shown in the mission dock). Keep it simple.

- [ ] **Update `src/views/MissionBoard/TrooperMissionCard.tsx`** — status stripe replaces inline `borderTop` style; add `rounded-xl overflow-hidden`; update Dropdown wrapper styling:

Find the container div and update:
```tsx
// Before
<div
  className={`bg-bg border flex-shrink-0 w-[180px] snap-start ${dim} ${expanded ? 'border-ok' : 'border-border'}`}
  style={{ borderTop: `3px solid ${color}` }}
>

// After
<div className={`bg-bg border flex-shrink-0 w-[180px] snap-start rounded-xl overflow-hidden ${dim} ${expanded ? 'border-accent' : 'border-border'}`}>
  <div style={{ height: 3, background: color }} />
```

Update the inner body padding:
```tsx
// Before
<div className="p-1.5 flex flex-col gap-1">
// After
<div className="p-2.5 flex flex-col gap-1.5">
```

Update name text:
```tsx
// Before
<div className="text-ok text-[11px] tracking-wider truncate">{trooper.name.toUpperCase()}</div>
// After
<div className="text-[13px] font-semibold truncate">{trooper.name}</div>
```

Update PipTracker color props — grit uses ok color, ammo uses grazed color:
```tsx
<PipTracker label="GRIT" value={trooper.grit} max={trooper.grit_max}
  color="oklch(0.76 0.13 155)"
  onChange={v => updateTrooper(trooper.id, { grit: v })} />
<PipTracker label="AMMO" value={trooper.ammo} max={trooper.ammo_max}
  color="oklch(0.82 0.13 90)"
  onChange={v => updateTrooper(trooper.id, { ammo: v })} />
```

- [ ] **Visual check:** Barracks cards show rounded corners, status stripe, status pill, loadout block, FLK in accent. Mission dock cards show status stripe, segmented pip bars.

- [ ] **Commit**
```bash
git add src/components/PipTracker.tsx src/components/StatusBadge.tsx \
        src/views/Barracks/TrooperCard.tsx src/views/MissionBoard/TrooperMissionCard.tsx
git commit -m "feat: V1 component polish — status stripes, pip bars, rounded cards, status pills"
```

---

### Task 4: Dice Tray

**Files:**
- Modify: `src/views/DiceTray/DiceTray.tsx`
- Modify: `src/views/DiceTray/DiceControls.tsx`
- Modify: `src/views/DiceTray/MobilityCheckRoll.tsx`
- Modify: `src/views/DiceTray/RollHistory.tsx`

- [ ] **Update `src/views/DiceTray/DiceTray.tsx`** — panel chrome:

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
    ? 'w-80 flex-shrink-0 h-full bg-surface border-l border-border flex flex-col overflow-hidden'
    : 'fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border rounded-t-xl flex flex-col shadow-2xl'

  return (
    <>
      {!isDesktop && (
        <div className="fixed inset-0 z-30 bg-black/40" onClick={close} />
      )}
      <div className={panel} style={isDesktop ? undefined : { maxHeight: '65vh' }}>
        <div className="flex justify-between items-center px-4 py-3 border-b border-border flex-shrink-0">
          <div className="lbl">Dice Tray</div>
          <button onClick={close}
            className="w-6 h-6 flex items-center justify-center rounded-sm bg-surface2 border border-border text-muted text-sm">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-5">
          <DiceControls />
          <div className="border-t border-border pt-4">
            <div className="lbl mb-3">Mobility Checks</div>
            <MobilityCheckRoll />
          </div>
          <div className="border-t border-border pt-4">
            <RollHistory />
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Replace `src/views/DiceTray/DiceControls.tsx`**:

```tsx
import { useRef, useState } from 'react'
import { useStore } from '../../store'
import { rollDice } from '../../utils/dice'
import { newId } from '../../utils/id'

// SVG shapes from EXAMPLE - dicebag/main.js (simplified path data)
const SHAPE_SVG: Record<string, string> = {
  d3:   `<svg viewBox="0 0 473 473" xmlns="http://www.w3.org/2000/svg"><path class="db-path" d="M386 60H87C71 60 58 73 58 90v293c0 17 13 30 29 30h299c16 0 29-13 29-30V90c0-17-13-30-29-30z"/></svg>`,
  d4:   `<svg viewBox="0 0 532 473" xmlns="http://www.w3.org/2000/svg"><path class="db-path" d="M266 30L502 450H30Z"/></svg>`,
  d6:   `<svg viewBox="0 0 473 473" xmlns="http://www.w3.org/2000/svg"><path class="db-path" d="M386 60H87C71 60 58 73 58 90v293c0 17 13 30 29 30h299c16 0 29-13 29-30V90c0-17-13-30-29-30z"/></svg>`,
  d8:   `<svg viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg"><path class="db-path" d="M240 20L460 240 240 460 20 240Z"/></svg>`,
  d10:  `<svg viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg"><path class="db-path" d="M240 20L460 240 240 460 20 240Z"/></svg>`,
  d12:  `<svg viewBox="0 0 562 535" xmlns="http://www.w3.org/2000/svg"><path class="db-path" d="M281 30l183 95 70 149H28l70-149Z M28 274l70 149 183 82 183-82 70-149Z"/></svg>`,
  d20:  `<svg viewBox="0 0 512 591" xmlns="http://www.w3.org/2000/svg"><path class="db-path" d="M256 20l222 128v245L256 521 34 393V148Z"/></svg>`,
  d100: `<svg viewBox="0 0 532 532" xmlns="http://www.w3.org/2000/svg"><ellipse class="db-path" cx="266" cy="266" rx="220" ry="160"/></svg>`,
  dx:   `<svg viewBox="0 0 532 532" xmlns="http://www.w3.org/2000/svg"><ellipse class="db-path" cx="266" cy="266" rx="220" ry="160"/></svg>`,
}

// Pip positions [left%, top%] for d3 (max 3) and d6 faces
const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[50,50]],
  2: [[75,25],[25,75]],
  3: [[75,25],[50,50],[25,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,20],[75,20],[25,50],[75,50],[25,80],[75,80]],
}

const DIE_TYPES = ['d3','d4','d6','d8','d10','d12','d20','d100','dx'] as const
type DieType = typeof DIE_TYPES[number]

function getSides(dieType: DieType, customSides: number) {
  if (dieType === 'dx') return Math.max(2, customSides)
  if (dieType === 'd3') return 3
  return parseInt(dieType.slice(1))
}

// CSS injected once for die shapes + spin animation
const DIE_CSS = `
  .db-path { fill: oklch(0.255 0.006 130); stroke: oklch(0.26 0.005 130); stroke-width: 2; vector-effect: non-scaling-stroke; }
  .die-shell-high .db-path { fill: color-mix(in oklch, oklch(0.72 0.13 155) 16%, oklch(0.255 0.006 130)); stroke: oklch(0.72 0.13 155); stroke-width: 2.5; }
  .die-shell-dim { opacity: 0.28; }
  @keyframes dc-spin {
    0%   { transform: rotate(0deg)   scale(0.65); }
    55%  { transform: rotate(330deg) scale(1.1); }
    100% { transform: rotate(360deg) scale(1); }
  }
`

interface RollResult {
  results: number[]
  sides: number
  total: number
  isZero: boolean
}

export default function DiceControls() {
  const addRoll = useStore(s => s.addRoll)
  const [dieType, setDieType]       = useState<DieType>('d6')
  const [count, setCount]           = useState(2)
  const [customSides, setCustomSides] = useState(6)
  const [modifier, setModifier]     = useState(0)
  const [label, setLabel]           = useState('')
  const [lastRoll, setLastRoll]     = useState<RollResult | null>(null)
  const spinTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [spinKey, setSpinKey]       = useState(0) // incremented to re-trigger animation

  const sides  = getSides(dieType, customSides)
  const isD6   = dieType === 'd6'
  const isD3   = dieType === 'd3'
  const usePips = isD6 || isD3

  const doRoll = () => {
    const isZero  = count === 0
    const rollCnt = isZero ? 2 : count
    const results = rollDice(rollCnt, sides)
    const total   = isZero
      ? Math.min(...results)
      : results.reduce((a, b) => a + b, 0) + modifier

    setLastRoll({ results, sides, total, isZero })
    spinTimers.current.forEach(clearTimeout)
    spinTimers.current = []
    setSpinKey(k => k + 1)

    addRoll({
      id: newId(), timestamp: Date.now(),
      label: label || `${count}${dieType}`,
      dice: `${count}${dieType}`,
      results, modifier: isZero ? 0 : modifier, total,
    })
  }

  const highVal = lastRoll
    ? (lastRoll.isZero ? Math.min(...lastRoll.results) : Math.max(...lastRoll.results))
    : null

  // Label offsets for shapes with off-centre visual centroids
  const labelOffset = (type: DieType) => {
    if (type === 'd4')  return { transform: 'translateY(4px)' }
    if (type === 'd12') return { transform: 'translateY(2px)' }
    return {}
  }

  return (
    <>
      <style>{DIE_CSS}</style>

      {/* Die type selector */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {DIE_TYPES.map(d => (
          <button key={d} onClick={() => setDieType(d)}
            style={{ width: 34, height: 34, position: 'relative', flexShrink: 0, cursor: 'pointer' }}>
            {/* SVG shape layer */}
            <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              dangerouslySetInnerHTML={{ __html: SHAPE_SVG[d].replace(
                'class="db-path"',
                dieType === d
                  ? 'style="fill:color-mix(in oklch,oklch(0.72 0.13 155) 16%,oklch(0.255 0.006 130));stroke:oklch(0.72 0.13 155);stroke-width:2.5;vector-effect:non-scaling-stroke;"'
                  : 'style="fill:oklch(0.255 0.006 130);stroke:oklch(0.26 0.005 130);stroke-width:2;vector-effect:non-scaling-stroke;"'
              )}} />
            {/* Label overlay */}
            <span style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: d === 'd100' ? 6.5 : 8.5, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              color: dieType === d ? 'oklch(0.72 0.13 155)' : 'oklch(0.62 0.006 100)',
              ...labelOffset(d),
            }}>
              {d}
            </span>
          </button>
        ))}
      </div>

      {/* dx custom sides */}
      {dieType === 'dx' && (
        <div className="flex items-center gap-2">
          <span className="lbl">Sides</span>
          <input type="number" min={2} max={999}
            className="w-16 bg-bg border border-border rounded-sm text-ink text-xs px-2 py-1 font-mono"
            value={customSides}
            onChange={e => setCustomSides(Math.max(2, parseInt(e.target.value) || 2))} />
        </div>
      )}

      {/* Count + modifier */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="lbl">Count</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCount(c => Math.max(0, c - 1))}
              className="w-7 h-7 flex items-center justify-center rounded-sm bg-surface2 border border-border text-ink-dim text-base hover:text-ink">−</button>
            <span className="flex-1 text-center font-mono text-base font-bold">{count}</span>
            <button onClick={() => setCount(c => Math.min(20, c + 1))}
              className="w-7 h-7 flex items-center justify-center rounded-sm bg-surface2 border border-border text-ink-dim text-base hover:text-ink">+</button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="lbl">Modifier</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModifier(m => Math.max(-5, m - 1))}
              className="w-7 h-7 flex items-center justify-center rounded-sm bg-surface2 border border-border text-ink-dim text-base hover:text-ink">−</button>
            <span className={`flex-1 text-center font-mono text-base font-bold
              ${modifier > 0 ? 'text-accent' : modifier < 0 ? 'text-wounded' : 'text-muted'}`}>
              {modifier >= 0 ? `+${modifier}` : modifier}
            </span>
            <button onClick={() => setModifier(m => Math.min(5, m + 1))}
              className="w-7 h-7 flex items-center justify-center rounded-sm bg-surface2 border border-border text-ink-dim text-base hover:text-ink">+</button>
          </div>
        </div>
      </div>

      {count === 0 && (
        <div className="text-[11px] text-muted italic text-center">0d mode — rolling 2, taking lowest</div>
      )}

      {/* Label + roll */}
      <div className="flex flex-col gap-2">
        <input placeholder="Label (optional)"
          className="w-full bg-bg border border-border rounded-sm text-ink text-xs px-2.5 py-1.5 outline-none focus:border-accent"
          value={label} onChange={e => setLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doRoll()} />
        <button onClick={doRoll}
          className="w-full py-2.5 bg-accent text-bg rounded-md font-semibold text-[13px] hover:brightness-110 active:scale-[0.98]">
          Roll Dice
        </button>
      </div>

      {/* Results */}
      {lastRoll && (
        <div key={spinKey} className="flex flex-col items-center gap-3">
          {lastRoll.isZero && (
            <div className="text-[10px] text-muted uppercase tracking-wide">
              2{dieType} · take lowest
            </div>
          )}
          <div className="flex flex-wrap gap-2 justify-center">
            {lastRoll.results.map((val, i) => {
              const isHigh = lastRoll.isZero
                ? (val === Math.min(...lastRoll.results) && i === lastRoll.results.indexOf(Math.min(...lastRoll.results)))
                : val === highVal
              const isDim = lastRoll.isZero && !isHigh
              const shellClass = isHigh ? 'die-shell-high' : isDim ? 'die-shell-dim' : ''
              const isLarge = dieType === 'd100' || dieType === 'dx'
              const numOffset = dieType === 'd4' ? { transform: 'translateY(8px)' }
                              : dieType === 'd12' ? { transform: 'translateY(3px)' } : {}

              // Stagger animation via CSS animation-delay
              const animStyle: React.CSSProperties = {
                width: 52, height: 52, position: 'relative', flexShrink: 0,
                animation: `dc-spin 0.45s cubic-bezier(0.22,0.61,0.36,1) ${i * 45}ms both`,
              }

              return (
                <div key={i} className={shellClass} style={animStyle}>
                  <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                    dangerouslySetInnerHTML={{ __html: SHAPE_SVG[dieType] }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {usePips ? (
                      (PIP_LAYOUTS[Math.min(val, 6)] || PIP_LAYOUTS[1]).map(([x, y], pi) => (
                        <div key={pi} style={{
                          position: 'absolute', width: 8, height: 8, borderRadius: '50%',
                          background: isHigh ? 'oklch(0.72 0.13 155)' : 'oklch(0.78 0.006 90)',
                          left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)',
                        }} />
                      ))
                    ) : (
                      <span style={{
                        fontSize: isLarge ? 11 : 15, fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: isHigh ? 'oklch(0.72 0.13 155)' : 'oklch(0.94 0.006 90)',
                        position: 'relative', ...numOffset,
                      }}>
                        {val}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Stats */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {lastRoll.isZero ? (
              <div className="flex flex-col items-center px-3 py-1.5 bg-surface2 border border-border rounded-sm">
                <span className="lbl text-[9px]">Result</span>
                <span className="font-mono text-[17px] font-bold text-accent">{Math.min(...lastRoll.results)}</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center px-3 py-1.5 bg-surface2 border border-border rounded-sm">
                  <span className="lbl text-[9px]">Highest</span>
                  <span className="font-mono text-[17px] font-bold text-accent">{highVal}</span>
                </div>
                <div className="flex flex-col items-center px-3 py-1.5 bg-surface2 border border-border rounded-sm">
                  <span className="lbl text-[9px]">Total</span>
                  <span className="font-mono text-[17px] font-bold">{lastRoll.total}</span>
                </div>
                {isD6 && lastRoll.results.filter(r => r === 6).length > 0 && (
                  <div className="flex flex-col items-center px-3 py-1.5 bg-surface2 border border-border rounded-sm">
                    <span className="lbl text-[9px]">Sixes</span>
                    <span className="font-mono text-[17px] font-bold text-accent">
                      {lastRoll.results.filter(r => r === 6).length}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
```

Implementation notes:
- The spin animation uses CSS `animation-delay` per die (index × 45ms) via inline style rather than JS `setTimeout` — simpler and achieves the same staggered effect. Re-triggering on new roll is handled by changing `spinKey` which remounts the results block.
- `dangerouslySetInnerHTML` for SVG shapes is safe here — the SVG strings are static hardcoded constants, not user input.
- The `.db-path` class in SHAPE_SVG is only used by the `DIE_CSS` style block for the type-selector buttons. Result die shapes use inline styles for fill/stroke, so the class is irrelevant on result dice.

- [ ] **Replace `src/views/DiceTray/MobilityCheckRoll.tsx`**:

```tsx
import { useState, useMemo } from 'react'
import { useStore } from '../../store'
import { rollDie } from '../../utils/dice'
import { effectiveMobility, mobilityCheck } from '../../utils/gameRules'
import { newId } from '../../utils/id'

export default function MobilityCheckRoll() {
  const allTroopers = useStore(s => s.troopers)
  const troopers = useMemo(() => allTroopers.filter(t => t.active), [allTroopers])
  const addRoll = useStore(s => s.addRoll)
  const [results, setResults] = useState<Record<string, { roll: number; pass: boolean }>>({})

  const roll = (id: string, name: string, effMob: number) => {
    const r = rollDie(6)
    const pass = mobilityCheck(effMob, r)
    setResults(p => ({ ...p, [id]: { roll: r, pass } }))
    addRoll({ id: newId(), timestamp: Date.now(), label: `${name} mob check`, dice: '1d6', results: [r], modifier: 0, total: r })
  }

  if (troopers.length === 0) return <div className="text-[11px] text-muted italic">No active troopers.</div>

  return (
    <div className="flex flex-col gap-2">
      {troopers.map(t => {
        const effMob = effectiveMobility(t)
        const r = results[t.id]
        return (
          <div key={t.id} className="flex items-center justify-between bg-bg border border-border rounded-lg px-2.5 py-2">
            <div>
              <div className="text-[12px] font-semibold">{t.name}</div>
              <div className="text-[10px] text-muted font-mono">MOB {effMob}</div>
            </div>
            <div className="flex items-center gap-2">
              {r && (
                <>
                  <span className="text-[12px] font-mono text-ink-dim">{r.roll}</span>
                  <span className={`text-[11px] font-bold ${r.pass ? 'text-ok' : 'text-bad'}`}>
                    {r.pass ? 'PASS' : 'FAIL'}
                  </span>
                </>
              )}
              <button onClick={() => roll(t.id, t.name, effMob)}
                className="text-[11px] font-semibold border border-border px-2.5 py-1 rounded-sm text-ink-dim hover:border-accent hover:text-accent">
                {r ? 'Re-roll' : 'Roll'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Replace `src/views/DiceTray/RollHistory.tsx`**:

```tsx
import { useStore } from '../../store'

export default function RollHistory() {
  const history = useStore(s => s.diceHistory)
  const clear   = useStore(s => s.clearHistory)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="lbl">History</div>
        <button onClick={clear} className="text-[10px] text-muted underline">clear</button>
      </div>
      <div className="max-h-[140px] overflow-auto flex flex-col gap-1">
        {history.length === 0
          ? <div className="text-[11px] text-subtle italic">No rolls yet.</div>
          : history.map(r => (
              <div key={r.id} className="flex justify-between items-baseline bg-bg border border-border rounded-sm px-2.5 py-1.5">
                <span className="text-[11px] text-muted truncate mr-3">{r.label}</span>
                <span className="text-[11px] font-mono shrink-0">
                  {r.results.join(', ')}
                  {r.modifier ? ` ${r.modifier > 0 ? '+' : ''}${r.modifier}` : ''}{' = '}
                  <span className="text-accent font-bold">{r.total}</span>
                  {r.note ? ` — ${r.note}` : ''}
                </span>
              </div>
            ))
        }
      </div>
    </div>
  )
}
```

- [ ] **Visual check:** Open Dice Tray. Die shapes appear. Click Roll — dice spin in staggered sequence. High die gets emerald tint. Pips on d3/d6. Stats chips appear below. Mobility check rows have rounded borders, pass=green/fail=red. History rows show accent total.

- [ ] **Run tests**
```bash
npm test
```
Expected: all 91 tests pass. (No logic was touched — tests cover gameRules, store, and dice utils only.)

- [ ] **Commit**
```bash
git add src/views/DiceTray/
git commit -m "feat: V1 dice tray — SVG die shapes, spin animation, polished mobility checks + history"
```

---

## Verification Summary

After all 4 commits:
1. `npm run dev` — no console errors, app loads
2. Desktop: 160px sidebar, brand mark, emerald active state, trooper count badge, LIVE badge when mission active
3. Barracks: rounded cards, status stripe, status pill, loadout block, FLK footer
4. Mission board: dock cards with status stripe, segmented pip bars, rounded borders
5. Dice tray: SVG shapes, spin on roll, high die highlighted, pips on d3/d6, stats chips, rounded mob check rows
6. Mobile: 4-tab bottom nav, full text labels
7. `npm test` — 91/91 pass

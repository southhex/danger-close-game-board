# Danger Close — Digital Play Aid

## What This Is

A browser-based React app that serves as a digital play surface for **Danger Close**, a solo TTRPG about infantry soldiers in war. Replaces nothing; stands alone as a self-contained tool that reduces friction for play.

**Source of truth:** Danger Close SRD v0.96.6 — https://lars1808.github.io/DANGER-CLOSE-SRD/
Design spec: `docs/superpowers/specs/2026-04-19-danger-close-play-aid-design.md`

---

## Boundary Rule

**Never create, read, or modify files outside this directory.** All work stays inside `/Users/michael/Documents/Coding/Projects/Danger Close Game Board`.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS v3 (dark theme default) |
| State | Zustand |
| Persistence | `localStorage` (key: `danger-close-app-state`) + JSON export/import |
| Font | `Share Tech Mono` (Google Fonts) |
| No backend | All data lives in browser or exported files |

---

## Project Structure

```
src/
  components/       # Shared UI primitives — barrel export via index.ts
    PipTracker, Dropdown, Modal, ConfirmDialog, GearPopover, StatusBadge, Stepper
  views/
    Barracks/       # TrooperCard, TrooperGrid (inlined), TrooperEditor, Barracks
    MissionBoard/   # SectorMomentumPanel, MissionNotes, TrooperCardDock,
                    # TrooperMissionCard, AdvanceRollPanel, MobilityCheckPhase, MissionBoard
    DiceTray/       # DiceControls, MobilityCheckRoll, RollHistory, DiceTray (modal)
    Settings/       # ExportImport, Settings
  store/index.ts    # Zustand store with persist; partialize excludes currentView + diceTrayOpen
  data/gear.ts      # 21-item static gear catalogue (3 armor, 3 weapons, 8 SW, 7 SE)
  hooks/
    useMediaQuery.ts
  utils/
    gameRules.ts    # Pure functions — all game logic lives here, never in components
    dice.ts         # rollDie, rollDice
    id.ts           # newId() — crypto.randomUUID() with fallback
  types.ts          # All TS interfaces: View, Trooper, GearItem, MissionState, AppState, etc.
  App.tsx           # Shell: desktop sidebar + mobile bottom tabs + DiceTray modal
docs/
  superpowers/
    specs/          # Design docs
    plans/          # Implementation plans
tests/              # Vitest unit tests (gameRules, dice, store)
```

---

## Colour Palette

```
Background:       #161a17
Surface/panels:   #1c2119
Borders:          #2c3a2c
Text primary:     #bbbaa8
Text secondary:   #687868
Accent positive:  #5a9e6e   green — flanking, ok, gaining
Accent neutral:   #a0a090   grey — engaged, in cover
Accent negative:  #c93535   red — flanked, losing, bleeding out
Accent warning:   #c8a030   amber — grazed
Accent orange:    #d45f27   wounded
```

---

## Key Data Models

Defined in `src/types.ts`. The SRD is the authority on all mechanics.

- `Trooper` — core persistent unit; permanent fields + mission-state fields including `special_weapon_uses` / `special_gear_uses`
- `GearItem` — static bundled data; includes `mobility_cost`, `reqcost`, `max_uses`, full `properties` text
- `MissionState` — one record per active mission; includes `stealth: boolean`
- `AppState` — root localStorage schema (`troopers`, `mission`, `diceHistory`)

---

## Game Rules (Encoded Logic)

All in `src/utils/gameRules.ts` — never inlined in components.

**Advance roll modifier:**
```
modifier = −floor(advance_rolls / 3) − wound_count + weather + (−sector.tl) + (stealth ? 3 : 0) + assault_ammo + drone_bonus
```
`drone_bonus` = 1 if any active trooper carries Drone Gear (does not stack), else 0.

**Advance result table (SRD v0.96.6):**
```
≤3  → AMBUSHED  — momentum −1, all Flanked
4–7 → SPOTTED   — momentum 0, all In Cover
8–10→ SURPRISE  — momentum +1, all Fortified
≥11 → OVERWHELM — no engagement
```

**Offensive positions:** each trooper rolls a Mobility Check (1d6 ≤ mobility) after the advance roll.
AMBUSHED: pass=Engaged, fail=Limited. SPOTTED/SURPRISE: pass=Flanking, fail=Engaged.
All pass → sector bypassed; if stealth active, floor(passes/2) Infiltration picks.

**Flanking bonus** (displayed on trooper card, derived from effective mobility):
```
mob 0–3 → +1 ATK   mob 4 → +2 ATK   mob 5 → +3 ATK
```

**Effective mobility during mission:** `trooper.mobility − (1 if wounded/bleedingout)`

**Position constraints:**
```
cover 0 → no fortified       space 0 → no flanking
cover 1 → at most 2 fortified  space 1 → at most 2 flanking
```

Violations: disable option in dropdown, never silently correct.

**Clamping:** Momentum −3 to +3. Grit/Ammo 0–3. Uses 0 to max_uses.

---

## UI Conventions

- Monospace font everywhere. Labels uppercase with letter-spacing.
- Minimal size hierarchy — use weight and colour for emphasis, not font size.
- Mobile-first. Mission board trooper cards scroll horizontally with snap, never wrap.
- State changes are immediate (no submit patterns) except: Trooper Editor saves, and destructive confirmations (mission reset, delete trooper, import overwrite, apply advance result).
- No gradients, no decorative imagery.
- `ConfirmDialog` tones: `tone="danger"` (red) for DELETE/RESET/OVERWRITE; `tone="default"` (amber) for apply/confirm actions.

---

## Critical Coding Patterns

**Zustand selectors must never return new object/array references.** Calling `.filter()`, `.map()`, or `.slice()` inside a selector causes infinite re-render loops:

```ts
// ❌ WRONG — creates new array on every render → infinite loop
const troopers = useStore(s => s.troopers.filter(t => t.active))

// ✅ CORRECT — select stable reference, filter in component body
const allTroopers = useStore(s => s.troopers)
const troopers = allTroopers.filter(t => t.active)
```

**Never use `useStore.getState()` inside React components.** Use selector hooks: `useStore(s => s.action)`.

**Trooper Editor save:** Only reset `special_weapon_uses` / `special_gear_uses` when the gear selection actually changed — preserves in-mission uses on unrelated edits.

---

## v1 Out of Scope

Campaign board, mission log, enemy tracking, multiplayer, cloud storage, undo/redo, print view.

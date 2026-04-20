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
  components/       # Shared UI primitives (PipTracker, Dropdown, Modal, etc.)
  views/
    Barracks/       # Squad roster management
    MissionBoard/   # Active play surface
    DiceTray/       # Modal dice roller
  store/            # Zustand store + selectors
  data/             # Bundled gear/armoury static data
  hooks/            # Custom hooks (usePersistence, etc.)
  utils/            # Game rules logic (advance modifier, position constraints)
  types.ts          # All TypeScript interfaces (Trooper, MissionState, etc.)
docs/
  superpowers/
    specs/          # Design docs
    plans/          # Implementation plans
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
modifier = −floor(advance_rolls / 3) − wound_count + weather + (−sector.tl) + (stealth ? 3 : 0) + assault_ammo
```

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
- State changes are immediate (no submit patterns) except: Trooper Editor saves, and destructive confirmations (mission reset, delete trooper, import overwrite).
- No gradients, no decorative imagery.

---

## v1 Out of Scope

Campaign board, mission log, enemy tracking, multiplayer, cloud storage, undo/redo, print view.

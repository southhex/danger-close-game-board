# Danger Close — Digital Play Aid: Design Spec

**Date:** 2026-04-19 (revised 2026-04-19)
**Status:** Approved
**Source of truth:** Danger Close SRD v0.96.6 — https://lars1808.github.io/DANGER-CLOSE-SRD/

---

## Overview

A browser-based React application serving as a digital play surface for **Danger Close**, a solo TTRPG about infantry soldiers in war. The tool reduces friction for pen-and-paper play and is equally usable on desktop and mobile. No backend. All data lives in the browser or in exported files.

**Deployment target:** Static hosting (GitHub Pages / Netlify). Vite `base` path configured for subdirectory deployment.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite (TypeScript template) |
| Styling | Tailwind CSS v3 — dark theme, utility-first |
| State | Zustand with `persist` middleware |
| Persistence | `localStorage` (key: `danger-close-app-state`) + JSON export/import |
| Font | `Share Tech Mono` via Google Fonts |
| Routing | None — state-based view switching via Zustand |

---

## Project Structure

```
src/
  components/       # Shared primitives: PipTracker, StatusBadge, Dropdown, Modal, ConfirmDialog
  views/
    Barracks/       # TrooperCard, TrooperGrid, TrooperEditor (modal)
    MissionBoard/   # SectorMomentumPanel, AdvanceRollPanel, TrooperCardRow, MissionNotes
    DiceTray/       # DiceControls, MobilityCheck, RollHistory
    Settings/       # ExportImport (+ future settings items)
  store/
    index.ts        # Zustand store — single store, all slices
    persist.ts      # localStorage key + serialisation helpers
  data/
    gear.ts         # Bundled armoury static data (full catalogue)
  utils/
    gameRules.ts    # Pure functions: advance modifier, position constraints, flanking bonus, result table
    dice.ts         # Roll functions
  types.ts          # All TypeScript interfaces
  App.tsx           # Layout shell: sidebar + view switcher + DiceTray modal
  main.tsx
docs/
  superpowers/
    specs/
    plans/
```

---

## Data Models

Defined in `src/types.ts`. The SRD is the authority on all game mechanics.

```ts
interface Trooper {
  id: string;
  name: string;                  // File/nickname, e.g. "Warden"
  fullname: string;              // Full name, e.g. "Sgt. James Chinoswa"
  callsign: string;              // Radio callsign, e.g. "Error 1"
  active: boolean;
  perkpoints: number;
  mobility: number;              // Effective base mobility (auto-computed: 5 − gear costs)
  armor: string;                 // GearItem name, geartype "armor"
  weapon: string;                // GearItem name, geartype "weapon"
  special_weapon: string;        // GearItem name, geartype "specialweapon" (empty if none)
  special_gear: string;          // GearItem name, geartype "specialequipment" (empty if none)
  perk: string;                  // Free-text individual perk
  notes: string;

  // Mission-state (reset on Prepare for Mission)
  grit: number;                  // 0–3
  ammo: number;                  // 0–3
  status: TrooperStatus;
  offpos: OffensivePosition;
  defpos: DefensivePosition;
  suppressed: boolean;
  def_modifier: number;
  special_weapon_uses: number;   // Remaining uses; -1 = unlimited
  special_gear_uses: number;     // Remaining uses; -1 = unlimited
}

type TrooperStatus = "ok" | "grazed" | "wounded" | "bleedingout" | "dead";
type OffensivePosition = "limited" | "engaged" | "flanking";
type DefensivePosition = "flanked" | "incover" | "fortified";

interface GearItem {
  name: string;
  geartype: "weapon" | "specialweapon" | "specialequipment" | "armor";
  description: string;           // Flavour / brief label
  properties: string;            // Full rules text, shown in tooltip/expand
  mobility_cost: number;         // Subtracted from base mobility 5 (0 if no cost)
  reqcost: number;               // Requisition cost (0 = freely available)
  max_uses: number;              // -1 = unlimited; ≥1 = capped uses per mission/engagement
}

interface MissionState {
  id: string;
  name: string;
  sector: {
    name: string;
    cover: 0 | 1 | 2;           // 0 Exposed / 1 Normal / 2 Dense
    space: 0 | 1 | 2;           // 0 Tight / 1 Transitional / 2 Open
    tl: 1 | 2 | 3 | 4;          // Threat Level
    weather: -2 | -1 | 0 | 1;   // −2 Terrible / −1 Bad / 0 Clear / +1 Advantaged
  };
  momentum: number;              // −3 to +3
  advance_rolls: number;         // Running count this mission
  stealth: boolean;              // Whether stealth bonus is currently active
  notes: string;
}

interface AppState {
  troopers: Trooper[];
  mission: MissionState | null;
  diceHistory: DiceRoll[];       // Capped at 20
}

interface DiceRoll {
  id: string;
  timestamp: number;
  label: string;
  dice: string;
  results: number[];
  modifier: number;
  total: number;
}
```

### Derived values (computed in `gameRules.ts`, not stored)

```ts
// Effective mobility during a mission (accounts for wound penalty)
effectiveMobility(trooper: Trooper): number
  = trooper.mobility - (trooper.status === 'wounded' || trooper.status === 'bleedingout' ? 1 : 0)

// Flanking bonus shown on trooper card
flankingBonus(effectiveMobility: number): number
  = effectiveMobility <= 3 ? 1 : effectiveMobility === 4 ? 2 : 3

// Mobility auto-computed in Trooper Editor when gear is selected
baseMobility(armor: GearItem, weapon: GearItem, specialWeapon: GearItem | null, specialGear: GearItem | null): number
  = 5 − armor.mobility_cost − weapon.mobility_cost − (specialWeapon?.mobility_cost ?? 0) − (specialGear?.mobility_cost ?? 0)
```

---

## Bundled Gear Data (`src/data/gear.ts`)

All data is static and bundled — not user-editable in v1.

### Armor

| Name | Mobility Cost | REQ | Properties |
|---|---|---|---|
| Light Armor | 0 | 0 | −1 to final Defense Roll result. |
| Medium Armor | −1 | 0 | No special properties. Standard issue. |
| Heavy Armor | −2 | 0 | +1 to final Defense Roll result. |

### Primary Weapons (`geartype: "weapon"`)

All have `mobility_cost: 0`, `reqcost: 0`, `max_uses: -1`.

| Name | Properties |
|---|---|
| Carbine | +1 ATK when Engaged in Tight Space (Cover 0). −1 ATK when Engaged in Open Space (Cover 2). |
| Assault Rifle | No special properties. The reliable workhorse. |
| Marksman Rifle | +1 ATK when Engaged in Exposed Cover (Cover 0). −1 ATK when Engaged in Dense Cover (Cover 2). |

### Special Weapons (`geartype: "specialweapon"`)

| Name | Mob Cost | REQ | Max Uses | Properties |
|---|---|---|---|---|
| Utility Kit | 0 | 0 | −1 | Active (1 Ammo each): **Smoke** — Squad gains +1 Mobility this Exchange, user may also Move. **Flashbang** (Tight Space only) — user gains ATK benefit of Flanking this Exchange. **Flare** (outdoors) — signal aerial strike; +2 ATK if sky obstructed, +3 ATK normally, +4 ATK open sky; all Flanked Troopers make Mobility Check (fail = 1d3 Injury). |
| LMG | −1 | 1 | −1 | Passive: +1 DEF for any Trooper receiving Covering Fire from this weapon. |
| HMG | −2 | 2 | −1 | Passive: +1 ATK when Fortified. Active (1 Ammo): Provide Covering Fire for up to 3 Troopers this round. |
| Sniper Rifle | −1 | 1 | −1 | Passive: +1 ATK when Fortified. +2 ATK when Fortified and did not Move last Exchange. |
| Grenade Launcher | −1 | 1 | −1 | Active (1 Ammo each): Deal 1 Hit to a Hard Target, OR grant another Trooper the Flanking ATK bonus on the next Offense Roll. Multiple grenades may be fired in one attack. |
| Melee Weapon | −1 | 0 | −1 | Passive: When Moving Up, choose to go Flanked instead of Flanking — gain +3 ATK (Flanking bonus included). |
| Rocket Launcher | −1 | 1 | **1** | Active (single use): +3 ATK, OR deal 2 Hits to a Hard Target. |
| Plasma Rifle | −1 | 3 | −1 | Active (no Ammo cost): Roll 1d6. 1 = +2 Injury, weapon destroyed. 2–3 = +1 Injury, +1 ATK. 4–5 = +2 ATK or 1 Hit (Hard Target). 6 = +3 ATK or 2 Hits (Hard Target). |

### Special Equipment (`geartype: "specialequipment"`)

| Name | Mob Cost | REQ | Max Uses | Properties |
|---|---|---|---|---|
| Demolition Charges | −1 | 0 | −1 | No combat use. Required for Breach objectives. Place during Engagement if Momentum ≥ GAINING GROUND: 2 Exchanges (Move Up + set charges). |
| Jump Pack | −1 | 2 | **1** | Once per Engagement: instantly shift to any Offensive/Defensive position. Resets each Engagement (player manually resets the use pip). |
| Drone Gear | −1 | 0 | −1 | +1 to each Advance Roll. Does not stack with multiple Drone Gear. |
| Medic Gear | −1 | 0 | −1 | Patch Wounded Troopers back to OK when out of combat (Catch Breath). |
| Radio Gear | −1 | 1 | **1** | Once per Mission: call an artillery strike on the current Sector. Hits in 1d2 Exchanges. Effect: +2 Momentum instantly, destroys all ground-based Hard Targets. All Troopers make a Mobility Check; failure = 1d3 Injury. |
| Supply Backpack | −1 | 1 | −1 | Holds 6 extra Ammo. Can be redistributed to Troopers out of combat. |
| Environmental Gear | −1 | 0 | −1 | Allows Troopers to traverse hazardous terrain or survive dangerous environments. One set covers 2 Troopers. |

---

## Zustand Store

Single store, all state in one place. `persist` middleware handles localStorage sync (debounced ~300ms). UI state excluded via `partialize`.

```ts
interface Store {
  // Persisted
  troopers: Trooper[]
  mission: MissionState | null
  diceHistory: DiceRoll[]

  // UI (not persisted)
  currentView: 'barracks' | 'mission' | 'settings'
  diceTrayOpen: boolean

  // Trooper actions
  addTrooper: (t: Omit<Trooper, 'id'>) => void
  updateTrooper: (id: string, patch: Partial<Trooper>) => void
  deleteTrooper: (id: string) => void
  prepareMission: () => void       // Resets all active trooper mission-state fields

  // Mission actions
  setMission: (patch: Partial<MissionState>) => void
  applyAdvanceResult: (result: ApplyAdvancePayload) => void

  // Dice actions
  addRoll: (roll: DiceRoll) => void
  clearHistory: () => void

  // UI actions
  setView: (v: 'barracks' | 'mission' | 'settings') => void
  setDiceTrayOpen: (open: boolean) => void

  // Import / Export
  importState: (raw: unknown) => void
  exportState: () => AppState
}

// Payload for applying an advance result
interface ApplyAdvancePayload {
  result: 'ambushed' | 'spotted' | 'surprise' | 'overwhelm'
  // Per-trooper offensive positions from Mobility Checks (undefined for OVERWHELM)
  trooperOffpos?: Record<string, OffensivePosition>
}
```

`prepareMission` resets per-trooper mission state:
- `grit: 3, ammo: 3, status: "ok", offpos: "engaged", defpos: "incover", suppressed: false, def_modifier: 0`
- `special_weapon_uses`: set to `gear.max_uses` if ≥ 1, else -1
- `special_gear_uses`: same logic

---

## Navigation & Layout

**Desktop (≥768px):** Narrow left sidebar (56px). Nav items: Barracks, Mission, Settings. Active item gets a left accent bar. Dice Tray button pinned to the bottom of the sidebar — opens modal, does not navigate.

**Mobile (<768px):** Top bar showing current view title + Dice Tray icon button. Bottom tab bar: Barracks, Mission, Settings.

`App.tsx` renders the active view and conditionally renders the `DiceTray` modal when `diceTrayOpen` is true.

---

## Views

### Barracks

- Trooper cards in a responsive grid (2 cols mobile, 3–4 cols desktop).
- Each card shows: name, callsign, fullname, active status, armor, weapon, special weapon, special gear, computed mobility, perk points. Inactive cards dimmed to 50% opacity.
- "Add Trooper" opens the Trooper Editor modal (empty).
- Clicking any card opens the Trooper Editor modal (pre-filled).
- **"Prepare for Mission" button** — resets all active trooper mission-state fields. Requires confirmation.

**Trooper Editor (centred modal):**
- Fields: name, fullname, callsign, active toggle, armor (dropdown), weapon (dropdown), special weapon (dropdown, optional), special gear (dropdown, optional), perk points, perk (free text), notes (free text).
- **Mobility display** — read-only, auto-computed as `5 − gear costs`. Updates live as gear dropdowns change.
- Each gear dropdown shows: `[Name] · MOB −X · REQ X` in the option label. Selected item shows its full properties beneath the dropdown as a reference.
- Delete button with confirmation. Save / Cancel.

---

### Mission Board

Panels in order (all stack vertically on mobile):

#### 1. Advance Roll Panel

The most complex panel. Manages the full Advance Roll flow from the SRD.

**Setup row:**
- Roll counter (− / n / +) labelled ADVANCE ROLLS
- Stealth toggle — when active, applies +3 to roll and shows "STEALTH ACTIVE" indicator. Auto-clears when SPOTTED or worse is applied, or when Assault is used.
- Assault input — numeric field: "ASSAULT: spend X ammo for +X". Player specifies total ammo to commit (they manage which troopers contribute). When used, disables Infiltration and clears Stealth.

**Modifier breakdown** (always visible):
> Fatigue −X · Wounds −X · Weather ±X · TL −X · Stealth +X · Assault +X = **±X**
- Fatigue: `−floor(advance_rolls / 3)`
- Wounds: `−(count of active troopers with status "wounded" or "bleedingout")`
- Weather: raw value (−2/−1/0/+1)
- TL: `−sector.tl`
- Stealth: +3 if stealth toggle is on
- Assault: the committed ammo value

**Roll 2d6 button** — opens Dice Tray pre-loaded with 2d6, labelled "Advance Roll", with the calculated modifier applied.

**After entering a result → Mobility Check phase:**
Shows the advance roll outcome (AMBUSHED / SPOTTED / SURPRISE / OVERWHELM) and then reveals a Mobility Check sub-panel for each active trooper:

- Each trooper shown with their effective mobility value and a Roll 1d6 button.
- Roll result compared to mobility: ≤ mobility = PASS, > mobility = FAIL.
- Offensive position auto-assigned per result (see Game Rules).
- If all troopers PASS and OVERWHELM was not rolled: show **"SECTOR BYPASSED"** option with Infiltration picks (if stealth was active: floor(pass count / 2) picks from: Cut Comms, Target Commanders, Trap, Exit Route).

**Apply Result button** (after Mobility Checks complete):
- Sets each trooper's `defpos` per the advance result (see Game Rules table).
- Sets each trooper's `offpos` per their Mobility Check result.
- Updates `momentum` if AMBUSHED (set to −1) or SURPRISE (set to +1).
- Increments `advance_rolls` by 1.
- Clears `stealth` if result was AMBUSHED or SPOTTED.
- Requires confirmation.

**Collapsible result reference table** — always available beneath, collapsed by default.

#### 2. Sector & Momentum Panel

Single combined card.

- **Sector dropdowns:** Cover (0–2), Space (0–2), Threat Level (1–4), Weather (−2/−1/0/+1).
- **Momentum** (right side, separated by divider): ◀ value + state label ▶. Clamped −3 to +3.
- **Constraint reminder** beneath: e.g. "Cover 1: max 2 Fortified · Space 1: max 2 Flanking"

#### 3. Trooper Card Dock

The trooper cards are **permanently docked to the bottom of the mission board viewport** — not a scrollable panel within the page flow. This is a core layout principle: cards are always visible, like a hand held in a card game (Hearthstone reference).

**Layout mechanics:**
- The card dock is `position: sticky; bottom: 0` (or fixed within the mission board scroll container), always pinned to the bottom edge of the screen.
- Cards have no bottom border — they extend flush to the screen edge, as if rising from below.
- A gradient fade (`background: linear-gradient(to top, #0e1210, transparent)`) sits behind the dock, softening the transition between board content and cards.
- Cards have a upward box-shadow (`box-shadow: 0 -4px 12px rgba(0,0,0,0.5)`) to give a raised, physical feel.
- The scrollable board content above (advance roll, sector/momentum, notes) has bottom padding equal to the dock height so no content is hidden behind it.
- If the squad exceeds the viewport width, cards scroll horizontally within the dock (CSS snap).

**Each card shows and allows inline editing of:**

Each card shows and allows inline editing of:

- **Name / Callsign** (display only)
- **Status** — dropdown, colour-coded by status
- **Grit** — 0–3 pip tracker
- **Ammo** — 0–3 pip tracker
- **Offensive Position** — dropdown (Limited / Engaged / Flanking). Constraint-enforced.
- **Defensive Position** — dropdown (Flanked / In Cover / Fortified). Constraint-enforced.
- **Suppressed** — toggle
- **DEF Modifier** — ± stepper

**Gear & mobility summary (always visible on card):**
- Armor name + DEF effect (e.g. "HEAVY ARMOR · DEF +1")
- Weapon name + brief condition note (e.g. "CARBINE · +ATK Tight / −ATK Open")
- Special weapon name + uses pip (if max_uses ≥ 1: shows remaining as clickable pips to mark used)
- Special gear name + uses pip (same logic; Jump Pack pip can be manually reset per engagement)
- **MOB: X** — effective mobility (`trooper.mobility − wound penalty`). Highlighted if reduced by wound.
- **FLK: +X** — flanking bonus derived from effective mobility

Tapping any gear item name shows a popover with the full properties text.

Card top border colour tracks status. Dead cards dimmed to 50% opacity.

#### 4. Mission Notes

Collapsible free-text area.

---

### Dice Tray (Modal)

Full-screen on mobile, centred modal on desktop.

- Quick-roll buttons: 2d6, 1d6, d66.
- Modifier stepper (integer, default 0). Label field.
- ROLL button — result display (individual dice + modifier + total; doubles highlighted on 2d6).
- **Mobility Check section:** lists active troopers with their effective mobility value. Roll 1d6 per trooper — ≤ mobility = SUCCESS, > mobility = FAIL. Results displayed inline.
- **Roll history:** scrollable log of last 20 rolls. Clear history button.

---

### Settings

Minimal v1 — scaffold for future expansion.

- **Export:** downloads `danger-close-save.json` (full `AppState` + `version: 1` + `exportedAt` ISO timestamp).
- **Import:** file picker for `.json`. Validates required keys before applying. On schema mismatch: warn and offer Overwrite or Cancel.

---

## Game Rules (Encoded Logic)

All in `src/utils/gameRules.ts` — pure functions, never inlined in components.

### Advance Roll Modifier

```
modifier = −floor(advance_rolls / 3)     // Fatigue
         − wound_count                   // Wounds (wounded + bleedingout)
         + weather                       // Raw value
         + (−sector.tl)                  // Threat Level
         + (stealth ? 3 : 0)             // Stealth bonus
         + assault_ammo                  // Ammo committed to Assault
```

### Advance Result Table (SRD v0.96.6)

| 2d6 + modifiers | Result | Momentum set to | Defensive Position |
|---|---|---|---|
| ≤ 3 | AMBUSHED | LOSING GROUND (−1) | All active: Flanked |
| 4–7 | SPOTTED | CONTESTED (0) | All active: In Cover |
| 8–10 | SURPRISE | GAINING GROUND (+1) | All active: Fortified |
| ≥ 11 | OVERWHELM | — (no change) | — (no engagement) |

Stealth is cleared on AMBUSHED or SPOTTED.

### Offensive Positions (from Mobility Checks)

After the advance roll result (for AMBUSHED / SPOTTED / SURPRISE), each active trooper rolls 1d6 vs their effective mobility:

| Result | Mobility Check PASS | Mobility Check FAIL |
|---|---|---|
| AMBUSHED | Engaged | Limited |
| SPOTTED | Flanking | Engaged |
| SURPRISE | Flanking | Engaged |

**If all troopers PASS:** Sector may be bypassed (no Engagement). If stealth was active: floor(pass_count / 2) Infiltration picks from: Cut Comms, Target Commanders, Trap, Exit Route.

### Flanking Bonus

Derived from effective mobility, displayed on trooper card:

| Effective Mobility | Flanking Bonus |
|---|---|
| 0–3 | +1 ATK |
| 4 | +2 ATK |
| 5 | +3 ATK |

A Trooper with effective mobility 0 automatically fails all Mobility Checks.

### Position Constraints

```
cover 0 → no trooper may be Fortified
cover 1 → at most 2 troopers may be Fortified
cover 2 → no limit

space 0 → no trooper may be Flanking
space 1 → at most 2 troopers may be Flanking
space 2 → no limit
```

Violations: disable the option in dropdowns (not hidden). All limits count currently-Fortified or currently-Flanking troopers across the active squad.

### Clamping

- Momentum: −3 to +3
- Grit: 0 to 3
- Ammo: 0 to 3
- Special weapon/gear uses: 0 to max_uses (floor)

---

## UI Conventions

**Colour palette:**
```
Background:       #161a17
Surface/panels:   #1c2119
Borders:          #2c3a2c
Text primary:     #bbbaa8
Text secondary:   #687868
Accent positive:  #5a9e6e   (OK, flanking, gaining)
Accent neutral:   #a0a090   (engaged, in cover)
Accent negative:  #c93535   (flanked, losing, bleeding out)
Accent warning:   #c8a030   (grazed)
Accent orange:    #d45f27   (wounded)
```

- Monospace font everywhere (`Share Tech Mono`). Labels uppercase with letter-spacing.
- Minimal size hierarchy — weight and colour for emphasis, not font size.
- Mobile-first. Trooper cards scroll horizontally with CSS snap, never wrap.
- Immediate state changes everywhere except: Trooper Editor save, and destructive confirmations (prepare for mission, delete trooper, import overwrite, apply advance result).
- No gradients. No decorative imagery.

---

## Persistence

- Zustand `persist` middleware auto-syncs to `localStorage` key `danger-close-app-state`, debounced ~300ms.
- `partialize` excludes `currentView` and `diceTrayOpen`.
- `importState(raw)` validates shape (checks required top-level keys) before applying. Warns on unknown fields, does not hard-fail.
- Export includes `version: 1` for future migration compatibility.

---

## Out of Scope (v1)

Campaign board, mission log, enemy tracking, multiplayer, cloud storage, undo/redo, print view, Requisition tracking, Bond mechanics, Field Report.

# Danger Close — Digital Play Aid

## What This Is

A browser-based React app that serves as a digital play surface for **Danger Close**, a solo TTRPG about infantry soldiers in war. Replaces nothing; stands alone as a self-contained tool that reduces friction for play.

**Source of truth:** Danger Close SRD v0.96.6 — https://lars1808.github.io/DANGER-CLOSE-SRD/
Design spec: `docs/superpowers/specs/2026-05-02-stage-2-design.md`

---

## Boundary Rule

**Never create, read, or modify files outside this directory.** All work stays inside `/Users/michael/Documents/Coding/Projects/Danger Close Game Board`.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS v3 (dark theme default) |
| State | Zustand (frontend) |
| Persistence | SQLite via `better-sqlite3` on the server; Zustand+sync to REST API |
| Auth | Session cookie (argon2 password hash) |
| Backend | Node.js + Hono, `server/` directory |
| Font | `Share Tech Mono` (Google Fonts) |

---

## Project Structure

```
src/
  api/
    client.ts     # Typed wrappers for all REST endpoints
    sync.ts       # Debounced PUT for trooper/dice + mission state sync
    bootstrap.ts  # Session bootstrap
  components/     # Shared UI primitives — barrel export via index.ts
    PipTracker, Dropdown, Modal, ConfirmDialog, GearPopover, StatusBadge, Stepper, TextPopover, Toast
  views/
    Auth/         # Login, Setup
    Barracks/     # Barracks, TrooperCard, TrooperEditor, SquadEditor
    HQ/           # HQ, CampaignOverviewCard, MissionSummaryCard, FieldReportPanel
    MissionBoard/ # Phase-aware board; SectorChainStrip, SectorEditorModal,
                  # SectorMomentumPanel, MissionNotes, TrooperCardDock,
                  # TrooperMissionCard, AdvanceRollPanel, MobilityCheckPhase,
                  # EngagementPanel, IntentStep, OffenseStep, DefenseStep,
                  # MomentumStep, EnemyTacticsStep,
                  # MoveModal, CoveringFireModal, GearActionModal,
                  # HardTargetPanel, AttachedForcePanel, CatchBreathPanel,
                  # DetermineSectorPanel, BoonResolver, AddSectorModal,
                  # EndMissionModal, DeployConfirmModal, MissionCompletePanel
    MissionBuilder/ # MissionBuilder, SectorBlueprintCard
    Armoury/      # Armoury, GearGrid, PurchaseConfirmDialog
    DiceTray/     # DiceControls, MobilityCheckRoll, RollHistory, DiceTray (modal)
    Settings/     # ExportImport, Settings
  store/index.ts  # Zustand store — squads, missions, troopers, campaigns, ui state
  data/gear.ts    # 21-item static gear catalogue (3 armor, 3 weapons, 8 SW, 7 SE)
  data/tags.ts    # 4 SRD tags + tagByName()
  hooks/
    useMediaQuery.ts
  utils/
    gameRules.ts  # Pure functions — all game logic; advance + engagement + sector rolls
    dice.ts       # rollDie, rollDice
    id.ts         # newId() — crypto.randomUUID() with fallback
    tokens.ts     # Auth token helpers
  types.ts        # All TS interfaces (see Key Data Models below)
  App.tsx         # Shell: desktop sidebar + mobile bottom tabs + DiceTray modal
server/
  src/
    db.ts                 # SQLite init + migrations
    index.ts              # Hono app mount
    routes/
      auth.ts, bootstrap.ts, campaigns.ts, squads.ts, missions.ts, req.ts
    migrations/
      001_initial.sql
      002_stage2.sql      # squads + missions tables, campaign REQ/airspace columns
      003_drop_current_mission.sql
docs/
  superpowers/
    specs/          # Design docs
    plans/          # Implementation plans
tests/              # Vitest unit tests (187 total — gameRules, store, component tests)
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

- `Trooper` — persistent unit; `squadId: string | null`, `recovering: boolean`, `wasBleedingOut: boolean`; mission-state fields including `special_weapon_uses` / `special_gear_uses`
- `Squad` — `{ id, campaignId, name, callsign?, sergeantId, perks[], notes }`; max 5 members
- `GearItem` — static bundled data; includes `mobility_cost`, `reqcost`, `max_uses`, full `properties` text
- `Mission` — top-level entity; `status: 'blueprint'|'live'|'completed'`; `objective`, `insertion`, `stealthStart`, `sectors?`, `squadId`, `fieldReport`, `state?: MissionState`
- `MissionSector` — `{ id, name, cover, space, tl, weather, status, description?, role?, contentsState?, boon?, empty?, rollCover?, rollSpace?, rollContents?, rollTL?, contentsType? }`. `contentsState` is derived on blueprint save from the roll flags — never set directly in the builder. Old sectors without roll flags are treated as legacy-undetermined in `DetermineSectorPanel` (full roll flow preserved).
- `MissionState` — live runner state: `{ sectors, activeSectorId, momentum, advance_rolls, stealth, notes, phase, engagement, nextAdvanceBonus?, pendingAttachedForces? }`
- `EngagementState` — full wizard state: step, pressure, hardTargets, attachedForces, intents, offenseResult, defenseResults, nextExchangeModifiers, etc.
- `Campaign` — `{ id, name, description, defaultAirspace, reqEnabled, req, currentMissionId }`
- `AppState` — root store schema: `{ campaigns, currentCampaignId, squads, missions, troopers, mission, diceHistory, … }`

---

## Key Flows

### Deploy flow
HQ Available Missions card → "DEPLOY" → `DeployConfirmModal` (squad picker, recovering blockers, sergeant warning) → `store.deployMission(missionId, squadId)` → server sets `campaigns.current_mission_id`, builds `MissionState` from blueprint, navigates to 'mission' view.

### DetermineSector phase
Sectors with `contentsState='undetermined'` trigger `phase='determine_sector'` on entry → `DetermineSectorPanel`. Each step (Cover/Space/Contents/TL) is conditional on its roll flag (`rollCover`, `rollSpace`, `rollContents`, `rollTL`). Predetermined values are used directly. If all flags are false, the panel fires `applySectorEmpty`/`applySectorRoll` immediately via `useEffect`. Old sectors without explicit flags get the full roll flow (legacy compat). Branches: TL+advance, Boon (`BoonResolver`), or Nothing (catch_breath).

### After-mission flow
CatchBreathPanel "END MISSION" → `EndMissionModal` (outcome selector, field-report textarea, survivor preview, REQ summary) → `store.completeMission` → server computes recovering flags + REQ → clears `currentMissionId`, navigates to 'hq'.

---

## Game Rules (Encoded Logic)

All in `src/utils/gameRules.ts` — never inlined in components.

**Advance roll modifier:**
```
modifier = −floor(advance_rolls / 3) − wound_count + weather + (−sector.tl) + (stealth ? 3 : 0) + assault_ammo + drone_bonus + nextAdvanceBonus
```
`drone_bonus` = 1 if any deployed trooper carries Drone Gear (does not stack), else 0.

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

**Engagement ATK calc** (per trooper firing):
```
total = 1 (base) + flanking bonus (if flanking) + weapon modifier + limited penalty (-1) + atkPenalty
```
Weapon modifiers: Carbine ±1 by space when Engaged; Marksman Rifle ±1 by cover when Engaged; Sniper Rifle +1/+2 when Fortified; HMG +1 when Fortified. All in `calcFireAtk()`.

**DEF pool** = 1 + armor bonus + covering fire + modifiers. Min 1. `calcDefPool()`.

**Offense outcome** (highest die): ≤3=pushed_back, 4–5=player choice, 6+=success.

**Defense outcome**: Flanked safe on 5+, In Cover safe on 4+, Fortified safe on 3+.

**Enemy tactics** (1d6 + TL): 2–4=none, 5=reposition, 6=scatter, 7=pinned_down, 8=encircle, 9=push_forward, 10+=fall_back.

**Recovering:** auto-set when trooper ends mission Wounded or was ever BleedingOut (`wasBleedingOut=true`). Auto-cleared on next deploy for troopers not in the deployed squad. Manual override allowed.

---

## UI Conventions

- Monospace font everywhere. Labels uppercase with letter-spacing.
- Minimal size hierarchy — use weight and colour for emphasis, not font size.
- Mobile-first. Mission board trooper cards scroll horizontally with snap, never wrap.
- State changes are immediate (no submit patterns) except: Trooper Editor saves, SquadEditor saves, and destructive confirmations (mission reset, delete trooper, import overwrite, apply advance result, sector switch mid-engagement).
- No gradients, no decorative imagery.
- `ConfirmDialog` tones: `tone="danger"` (red) for DELETE/RESET/OVERWRITE; `tone="default"` (amber) for apply/confirm actions.
- Nav: sidebar/bottom nav shows Mission entry only when `currentMissionId` is set. Builder is a non-nav route — reached via HQ "+ NEW MISSION" / "EDIT" only.

---

## Critical Coding Patterns

**Zustand selectors must never return new object/array references.** Calling `.filter()`, `.map()`, or `.slice()` inside a selector causes infinite re-render loops:

```ts
// ❌ WRONG — creates new array on every render → infinite loop
const troopers = useStore(s => s.troopers.filter(t => t.squadId !== null))

// ✅ CORRECT — select stable reference, filter in component body
const allTroopers = useStore(s => s.troopers)
const troopers = allTroopers.filter(t => t.squadId !== null)
```

**Never use `useStore.getState()` inside React components.** Use selector hooks: `useStore(s => s.action)`.

**`isDeployed(t, mission)` is the sole deployment signal.** Returns `t.squadId === mission.squadId` when mission is live. Never check `t.active` (field removed in Stage 2.3).

**Trooper Editor save:** Only reset `special_weapon_uses` / `special_gear_uses` when the gear selection actually changed — preserves in-mission uses on unrelated edits.

**Sector chip interaction:** chip body activates the sector via `setActiveSector` (which sets phase to `'determine_sector'` for undetermined sectors or `'advance'` for predetermined, clears `engagement`, zeroes `advance_rolls`, and demotes the previously-active sector to `'pending'`). The small `✎` button opens the editor. `SectorChainStrip` prompts a confirmation dialog before switching when an engagement or advance roll is in progress.

**`resetMission` resets troopers too.** It calls `resetTrooperForMission` on all deployed troopers (status/grit/ammo/positions/uses). Don't add separate trooper-state-reset calls in the Settings UI.

---

## Stage 3+ Out of Scope

Campaign board, free-roam objective type, hex topology, procedural mission generation, Bonds, app themes, cross-campaign stats, undo/redo, print view.

---

## Store Schema History

| Version | Changes |
|---|---|
| 0 | Initial — `perk: string`, no `tag`, `grit_max`, `ammo_max` |
| 1 | `perks: Perk[]`, `tag`, `grit_max`, `ammo_max` on Trooper |
| 2 | `mission.sector` → `mission.sectors[]` + `activeSectorId`; `phase`; `engagement` |

---

## Server Database Migrations

| File | Changes |
|---|---|
| `001_initial.sql` | users, sessions, campaigns, troopers, dice_rolls |
| `002_stage2.sql` | squads + missions tables; campaigns gains defaultAirspace, reqEnabled, req, currentMissionId |
| `003_drop_current_mission.sql` | drops legacy campaigns.current_mission JSON column |

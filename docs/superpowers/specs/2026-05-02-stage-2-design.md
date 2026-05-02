# Stage 2 Design — Squads, Mission Builder, HQ, Armoury, Runner Integration

**Status:** design spec, 2026-05-02
**Successor to:** Stage 1 (foundation, complete 2026-05-01 on `main`)
**SRD authority:** v0.96.8 — chapters 01 (The Squad), 02 (The Mission), 03 (Sectors), 09 (After The Mission)

## Context

Stage 1 shipped a fully server-backed v2 foundation with multi-campaign support, but Barracks/Mission still work like v1: trooper `active` flag, single mission stored as a JSON blob on the campaign, no campaign metadata, no mission planning, no economy, no history. Stage 2 promotes the campaign to a real entity, with squads, planned and historical missions, REQ economy, sit-out recovery, and a Mission Builder that feeds the existing engagement runner. It also closes a gap in the runner: SRD allows sectors to be determined on entry (1d6 rolls for Cover/Space/Contents/Boon) — the current runner assumes everything is pre-set and every sector leads to an engagement.

## Scope

### In

- **Squads** — persistent 5-trooper units with name, sergeant, perks (free-text), notes; replace the implicit `active` flag.
- **Deployment flow** — pick squad → confirmation modal (loadouts, blockers) → deploy.
- **Mission Builder** — single-screen form covering name, difficulty, airspace, weather default, objective type+subtype, sector chain (with role + content-state), insertion type (air/ground), stealth start, description. Saves as blueprint or deploys immediately.
- **Mission as a first-class entity** — normalised `missions` table; `status: blueprint | live | completed`; campaign points to current live mission.
- **HQ page** — campaign overview: airspace, REQ pool (read-only here), squad roster with sit-out indicators, current/next mission card, Available Missions list (blueprints), Mission History list (completed, click → Field Report).
- **Armoury page** — REQ pool (editable), gear catalogue, "purchase" gear for troopers (REQ deducted).
- **REQ economy** — pure SRD: +1 per surviving trooper on completion; manual override only on Armoury.
- **Recovering trooper status** — auto-set after-mission for end-Wounded or ever-BleedingOut; blocks squad assignment; auto-cleared when next mission deploys without them; manual override available.
- **Mission Runner integration** — new `determine_sector` phase, DetermineSectorPanel (Cover/Space/Contents/Boon rolls), Nothing-skips-engagement path, BoonResolver.
- **After-mission flow** — REQ award, Grit refill (+1 to max 3), recovering flag set, Field Report prompt.
- **Field Reports** — free-text journal entries on completed missions (add/view).
- **Sector description** — short text field on each sector, set in builder, displayed in SectorHeader during play.

### Out (Stage 3 or later)

- Free Roam Engagement objective type (multi-objective tracking, extract-when-ready).
- Hex / free-form sector topology.
- Procedural mission generation (length 7/9/11 + branches + entry-time objective check).
- Bonds (once-per-mission injury negation, dead-bond +1d6 trigger).
- App themes, cross-campaign stats.
- Sector "Fleshing Out" 1d6 fiction prompts (narrative-only; deferred for now).
- Boon mechanics for "Prepared Ground" (needs pursuit-into-cleared) and "Positions Revealed" (needs branching topology) — show as descriptive notes only in Stage 2.

### SRD-divergent (intentional homebrew)

- **Squad perks** — free-text `Perk[]` like trooper perks. Source is the full ruleset, not the SRD.
- **Mission-level default weather** — SRD has no weather; v1 added per-sector weather. Stage 2 adds a mission-level default that pre-fills sectors.
- **Ground insertion** — SRD assumes air insertion; ground insertion skips airspace/take-fire/crash entirely. Applies to LZ and EZ independently.
- **Manual REQ edit** — Armoury allows direct editing of REQ pool; SRD does not specify a manual override.

## Data Model

`src/types.ts`

```ts
// NEW
export interface Squad {
  id: string
  campaignId: string
  name: string
  callsign?: string
  sergeantId: string | null   // must be one of squad members; nullable while empty
  perks: Perk[]               // free-text; non-mechanical for now
  notes: string
  created_at: string
}

// CHANGED
export interface Trooper {
  // remove:  active: boolean
  squadId: string | null              // null = unassigned (barracks pool)
  recovering: boolean                 // sit-out flag; auto-set, override-clearable
  // …rest unchanged (status, grit, ammo, gear, perks, etc.)
}

// NEW — top-level mission entity
export type MissionStatus = 'blueprint' | 'live' | 'completed'
export type MissionObjectiveCategory = 'seize_secure' | 'hit_run' | 'defensive'
export type MissionObjectiveSubtype =
  | 'assault' | 'search_destroy' | 'breach'
  | 'raid' | 'recon' | 'extraction' | 'recovery' | 'sabotage'
  | 'siege' | 'evacuation' | 'last_stand'
export type MissionDifficulty = 'routine' | 'hazardous' | 'desperate'
export type Airspace = 'clear' | 'contested' | 'hostile'
export type InsertionType = 'air' | 'ground'

export interface Mission {
  id: string
  campaignId: string
  status: MissionStatus
  name: string
  description: string
  difficulty: MissionDifficulty
  airspace: Airspace                  // mission-specific (defaults from campaign)
  defaultWeather: -2 | -1 | 0 | 1     // applied to new sectors
  objective: {
    category: MissionObjectiveCategory
    subtype: MissionObjectiveSubtype
  }
  insertion: { lz: InsertionType; ez: InsertionType | null }
  stealthStart: boolean
  sectors: MissionSector[]
  activeSectorId: string | null       // null until deployed
  phase: MissionPhase                 // ditto
  engagement: EngagementState | null
  momentum: number
  advance_rolls: number
  stealth: boolean                    // current stealth state, distinct from stealthStart
  notes: string
  transitionFromSectorId: string | null
  squadId: string | null              // set at deploy
  fieldReport: string                 // populated after completion
  completed_at: string | null
  created_at: string
}

// CHANGED — new role + contentsState + description
export type SectorRole = 'standard' | 'lz' | 'ez' | 'objective'
export type SectorContentsState = 'predetermined' | 'undetermined' | 'rolled'
export interface MissionSector {
  id: string
  name: string
  description: string                 // short, displayed in SectorHeader
  role: SectorRole
  contentsState: SectorContentsState
  cover: 0 | 1 | 2                    // valid only when contentsState ≠ 'undetermined'
  space: 0 | 1 | 2
  tl: 1 | 2 | 3 | 4
  weather: -2 | -1 | 0 | 1
  status: 'pending' | 'active' | 'cleared'
  // NEW — Boon side-effects (set when contentsState='rolled' via Boon)
  boon?: {
    type: 'ammo_cache' | 'enemy_intel' | 'prepared_ground' | 'fallen_friendlies'
        | 'positions_revealed' | 'rookies'
    note?: string                     // descriptive-only Boons store flavour text
    consumed?: boolean                // for one-shot Boons (ammo, intel)
  }
  // NEW — sectors with contents='Nothing' from the contents roll
  empty?: boolean                     // set true when contents roll = "Nothing"
}

// CHANGED — new phase
export type MissionPhase =
  | 'determine_sector'                // NEW: roll Cover/Space/Contents on entry
  | 'advance'
  | 'engagement'
  | 'catch_breath'
  | 'mission_complete'

// CHANGED — campaign gains state
export interface Campaign {
  id: string
  name: string
  description: string
  defaultAirspace: Airspace           // NEW — used as default for new missions
  reqEnabled: boolean                 // NEW — toggle for REQ tracking
  req: number                         // NEW — pool, edited only on Armoury
  currentMissionId: string | null     // NEW — replaces inline current_mission
  created_at: string
}

// NEW — top-level state
export interface AppState {
  troopers: Trooper[]
  squads: Squad[]
  missions: Mission[]
  diceHistory: DiceRoll[]
}

// REMOVED — `MissionState` is now `Mission` (with status). The standalone live-mission state
// disappears; live state is just the mission with status='live'.
```

## SQLite Schema (Stage 2 additions)

```sql
ALTER TABLE campaigns ADD COLUMN default_airspace TEXT NOT NULL DEFAULT 'contested';
ALTER TABLE campaigns ADD COLUMN req_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN req INTEGER NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN current_mission_id TEXT;        -- nullable FK
ALTER TABLE campaigns DROP COLUMN current_mission;               -- replaced by missions table

CREATE TABLE squads (
  id           TEXT PRIMARY KEY,
  campaign_id  TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  data         TEXT NOT NULL,                                    -- JSON blob
  created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE missions (
  id           TEXT PRIMARY KEY,
  campaign_id  TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  status       TEXT NOT NULL,                                    -- blueprint|live|completed
  data         TEXT NOT NULL,                                    -- JSON blob (full Mission)
  completed_at TEXT,                                             -- nullable
  created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_missions_campaign_status ON missions(campaign_id, status);

-- Existing tables unchanged: users, sessions, troopers, dice_rolls
```

Trooper JSON gains `squadId` and `recovering`; existing rows get `squadId=null, recovering=false` on first read. No data migration script needed — Stage 1 didn't preserve user data either, and per-row JSON shape is read with safe defaults.

## API Surface (Stage 2 additions)

```
# Campaigns — extended
PATCH  /api/campaigns/:id              — also updates defaultAirspace, reqEnabled
GET    /api/campaigns/:id              — payload now includes squads[], missions[] (lite),
                                          currentMission (full)

# Squads
POST   /api/campaigns/:id/squads       — create
PATCH  /api/squads/:id                 — rename, sergeant, perks, notes
DELETE /api/squads/:id                 — members fall back to unassigned

# Missions
POST   /api/campaigns/:id/missions     — create blueprint
PATCH  /api/missions/:id               — edit (only allowed when status=blueprint)
DELETE /api/missions/:id                — only blueprint or completed
POST   /api/missions/:id/deploy        — { squadId } → status=blueprint→live;
                                          campaign.currentMissionId = id;
                                          run resetTrooperForMission on squad members
POST   /api/missions/:id/complete      — body: { fieldReport: string };
                                          award REQ; set recovering flags; status=completed
PUT    /api/missions/:id/state         — full Mission replacement (debounced sync, live only)

# Armoury
PATCH  /api/campaigns/:id/req          — { req: number } direct edit
POST   /api/campaigns/:id/req/spend    — { amount, trooperId, gearChange } atomic spend
```

The existing `PUT /api/campaigns/:id/state` is replaced by `PUT /api/missions/:id/state` for live mission sync. Trooper edits go through a new `PUT /api/campaigns/:id/troopers` (full troopers array — same shape as today, debounced from store).

## Squads & Deployment

### Barracks UI

Vertical layout:

1. **+ NEW SQUAD** button.
2. For each squad:
   - Header row: name, callsign, member count `(3/5)`, sergeant pip, edit (✎), delete (🗑) buttons.
   - 5 slots — filled with `TrooperCard`s (or empty placeholder "+ ASSIGN" rows). Each slot has a "set as sergeant" toggle in trooper context menu.
   - Disabled when squad is currently deployed.
3. **Unassigned pool** at the bottom — TrooperCards with squadId=null. `recovering` troopers shown with amber overlay + "RECOVERING" badge; clicking opens override dialog.

`SquadEditor.tsx` modal — name, callsign, perks (PerkRow reuse), notes.

### Trooper editor

- Remove `active` checkbox.
- Add squad dropdown (Unassigned / Squad A / Squad B / …). Squads at 5 members are disabled options.
- Cannot move a recovering trooper into a squad (option disabled with tooltip "RECOVERING").

### Deploy flow

Triggered from Mission Builder's "DEPLOY NOW" button **or** Available Missions card "DEPLOY". Jumps to `DeployConfirmModal`:

- Lists each squad member: name, callsign, status badge, recovering badge, weapon, special weapon, armor, mobility.
- Per-member blockers: status `dead` / `bleedingout` / `recovering` → row flagged amber with reason; deploy button disabled.
- Squad-level blocker: no sergeant set → "SET SERGEANT" CTA inline; modal links to SquadEditor.
- Buttons: "EDIT IN BARRACKS" (jumps), "CANCEL", "DEPLOY".
- Confirm → `POST /api/missions/:id/deploy { squadId }` → mission becomes live, members reset for mission, view switches to Mission.

### Active flag replacement

`isDeployed(t, mission)` helper in `gameRules.ts`:

```ts
export const isDeployed = (t: Trooper, mission: Mission | null): boolean =>
  !!mission && mission.status === 'live' &&
  t.squadId !== null && t.squadId === mission.squadId
```

All `t.active` call sites migrate (~20 — store mutators, gameRules predicates, mission view components, Barracks card opacity replaced with squadId-based logic).

## Mission Builder

Single-page form. Layout: left column = mission meta, right column = sector chain. Mobile = stacked.

### Fields

- **Name** (text, required)
- **Difficulty** — Routine / Hazardous / Desperate. Dice icon next to label rolls 1d6 to set per SRD (1–3 Routine, 4–5 Hazardous, 6 Desperate).
- **Airspace** — Clear / Contested / Hostile. Pre-fills from `campaign.defaultAirspace`.
- **Default Weather** — −2/−1/0/+1 picker. Applies to new sectors as their starting weather.
- **Objective** — two dropdowns:
  - Category: Seize & Secure / Hit & Run / Defensive (Free Roam disabled with tooltip "STAGE 3").
  - Subtype: filtered by category.
- **Description** (textarea)
- **Insertion** — LZ: Air / Ground. EZ: None / Air / Ground. Required EZ for Hit & Run subtypes (Raid/Recon/Extraction/Recovery/Sabotage); optional otherwise. Validation enforces.
- **Stealth start** — checkbox.

### Sector chain editor

Vertical list of `SectorBlueprintCard`s. Each card:

- Drag handle (reorder).
- Name (text).
- Role dropdown — Standard / LZ / EZ / Objective. Validation:
  - Exactly one LZ required.
  - Exactly one EZ if mission has EZ insertion.
  - At least one Objective sector.
- Description (short text).
- "DETERMINE NOW" toggle:
  - Off (default for non-LZ): `contentsState='undetermined'`. Card collapsed — only name/role/description/weather visible. Cover/Space/TL hidden.
  - On: card expanded with Cover/Space/TL/weather inputs (incl. dice icons that roll per SRD tables). `contentsState='predetermined'`.
- LZ sector defaults to determined (you know where you're landing) but can be overridden.
- "+ ADD SECTOR" button at the bottom.

### Buttons

- **SAVE BLUEPRINT** — `POST /api/campaigns/:id/missions` (or `PATCH` if editing) with `status='blueprint'`. Returns to HQ.
- **DEPLOY NOW** — saves then opens deploy flow. Mission becomes live on confirm.
- **CANCEL** — back to HQ; unsaved changes confirmed.

### Editing existing blueprint

Same screen, opened via "EDIT" button on Available Missions card. PATCH instead of POST. Editing locked once status=live.

## HQ Page

Card grid layout. Cards (in order):

1. **Campaign overview** — name (editable inline), description, default airspace (settable), REQ enabled toggle, REQ pool (read-only here).
2. **Current Mission** — if `currentMissionId` is set, mission-summary card with name, sector progress (e.g. "3/5 cleared"), momentum, status. "RESUME" button.
3. **Squad roster** — compact list of squads + member counts. Click → Barracks scoped to that squad. Recovering troopers indicated with amber dot.
4. **Available Missions** — list of blueprint cards. Each card shows name, difficulty, objective, sector count. Click → mission summary modal with EDIT / DEPLOY / DELETE.
5. **Mission History** — completed missions, newest first. Each card: name, completed date, outcome (victory / defeat / aborted), squad name, surviving count. Click → opens FieldReportPanel (read-only details + read/edit field report text).
6. **+ NEW MISSION** action — opens Mission Builder with empty form.

## Armoury Page

- **REQ pool** at the top — large display, edit button → numeric input + confirm. PATCH `/api/campaigns/:id/req`.
- **Gear catalogue** — grid of `GearItem`s grouped by type (Armor/Weapon/Special Weapon/Special Equipment).
- **Trooper picker** — dropdown to scope "purchase for trooper". Picking a trooper enables BUY buttons next to gear they can equip.
- **Buy** flow: confirm → `POST /api/campaigns/:id/req/spend { amount: gear.reqcost, trooperId, gearChange }` — server atomically deducts and writes the trooper. If `req_enabled=false`, REQ panel hidden and BUY is unconditional (gear changes only).

## Mission Runner Integration

### New phase: `determine_sector`

Triggered when a sector becomes active (via `setActiveSector` or `advanceToNextSector`) and `sector.contentsState === 'undetermined'`.

`DetermineSectorPanel.tsx` — sequential reveal (each step locked until previous resolved):

1. **Cover roll** — 1d6 → 0/1/2 (1, 2–4, 5–6). Show table; show result; "ROLL" button writes to sector.
2. **Space roll** — same pattern.
3. **Weather** — pre-filled from `mission.defaultWeather`; one-tap reroll (1d6 → −2/−1/0/+1 mapping shown) or manual pick.
4. **Sector Contents roll** — 1d6 vs `mission.difficulty`. Three branches, **only the TL branch runs an advance roll**:
   - **TL N (engagement)** → `sector.tl = N; contentsState = 'rolled'; phase = 'advance'`. SectorEnteredBanner shows full notation. Standard runner flow continues: advance roll → engagement → catch_breath.
   - **Boon** → roll Boon → BoonResolver applies → `contentsState = 'rolled'; status = 'cleared'; phase = 'catch_breath'`. **No advance roll, no engagement** — the Boon is the sector's content. CatchBreathPanel banner notes the boon name + effect.
   - **Nothing** → `sector.empty = true; contentsState = 'rolled'; status = 'cleared'; phase = 'catch_breath'`. **No advance roll, no engagement.** CatchBreathPanel banner notes "Sector empty — no opposition encountered."

The advance roll positions troopers for engagement; with no engagement to enter, it has no purpose, so Boon and Nothing skip it.

After step 4 the panel collapses into a summary stripe at the top of the next phase's view.

### BoonResolver

| Boon | Behaviour |
|---|---|
| Ammo Cache | Button "APPLY +1 AMMO TO ALL DEPLOYED" — increments `ammo` on all deployed troopers (capped at `ammo_max`). |
| Enemy Intel | Sets `mission.nextAdvanceBonus = 1` (new field). AdvanceRollPanel consumes it on next roll and clears. |
| Prepared Ground | Stores `sector.boon = { type: 'prepared_ground', note: 'Auto +1 momentum if pursued back here' }`. **Note-only Stage 2** — pursuit not modelled. |
| Fallen Friendlies | Modal: roll 1d3 (ammo), roll 1d6 (special weapon: 1–3 LMG, 4–5 Sniper Rifle, 6 Rocket Launcher). User assigns ammo to one trooper, weapon to another (or skip). Applies via mutators. |
| Positions Revealed | Stores `sector.boon.note` listing names of adjoining sectors with their TL+Cover. **Display-only Stage 2** (branching topology not yet supported, so usually adjoining = next linear sector). |
| Rookies | Adds an `AttachedForce { name: 'Rookies', dice: 2, isVip: false, committed: false }` to `mission.engagement.attachedForces` at next engagement start. Stored as pending on `mission.pendingAttachedForces[]` (new field) until engagement begins. |

### Phase-machine changes

`store.setActiveSector(id)` and `store.advanceToNextSector()` both check sector.contentsState first:

```ts
const phase = sector.contentsState === 'undetermined' ? 'determine_sector' : 'advance'
```

`MissionBoard.tsx` adds the new branch:
```tsx
{mission.phase === 'determine_sector' && <DetermineSectorPanel />}
```

`clearAndAdvanceMission` helper (existing) is reused from the Nothing/Boon paths — call it after marking the empty/Boon sector cleared.

### Mid-mission ADD NEXT SECTOR

CatchBreathPanel's existing "ADD NEXT SECTOR" button creates an undetermined sector by default — only name/role/description prompted, no Cover/Space/TL/weather. New mini-modal `AddSectorModal.tsx`. The next advance roll → DetermineSectorPanel triggers automatically.

A "PRE-FILL CONTENTS" toggle on AddSectorModal lets the user fully specify if they want to.

### Cleared sector reactivation

Per SRD ch.3: *"Other previously cleared Sectors are not necessarily safe forever, due to roaming patrols."* Stage 2 supports this with a manual reactivation flow.

The existing `SectorChainStrip` rule (cleared chips disabled for activation) **stays as-is** — you can't tap-to-activate a cleared chip directly. But the chip's ✎ button opens an editor that *does* allow editing on cleared sectors. New behaviour:

`SectorEditorModal` on a cleared sector exposes:

- Cosmetic edits — name, description, weather (always allowed).
- **REACTIVATE SECTOR** button (cleared sectors only). Confirm dialog: *"Reactivate cleared sector? Squad can advance back here. Optional: re-roll contents on entry."* with two checkboxes:
  - "Reset contents (re-roll on entry)" — sets `contentsState = 'undetermined'`, clears `boon`, `empty`, leaves Cover/Space/TL fields stale (overwritten on next determine roll).
  - "Keep current contents" — preserves Cover/Space/TL/Boon as they are; sector simply re-pends.
- Confirm → `status: 'cleared' → 'pending'`. Sector becomes a normal pending chip.

Once reactivated, the sector behaves like any pending sector. Advancing into it follows the standard flow (DetermineSectorPanel if undetermined, AdvanceRollPanel if predetermined). Multiple reactivations are allowed — the sector cycles cleared→pending→active→cleared as many times as the GM wants.

**Edge cases:**
- Reactivating a sector that contained a one-shot Boon (Ammo Cache, Enemy Intel, Fallen Friendlies) and choosing "Keep current contents" sets `boon.consumed = true` so the BoonResolver doesn't re-apply. The chip displays the boon name but greyed out.
- The active sector cannot be reactivated (it isn't cleared). The mission-complete sector cannot be reactivated (mission is over).
- `clearAndAdvanceMission` is unaffected — it only fires on natural progression, not on reactivation.

## After-Mission Flow

Triggered from `MissionCompletePanel`'s existing "END MISSION" button. Now opens an `EndMissionModal`:

1. Outcome selector — Victory / Defeat / Aborted.
2. Field Report textarea (free text, optional, can be added later).
3. Survivor preview (read-only) — names + status.
4. REQ summary — "+N REQ awarded (1 per surviving trooper)" if `campaign.reqEnabled`.
5. **CONFIRM** → `POST /api/missions/:id/complete { fieldReport, outcome }`:
   - Status → `completed`, `completed_at` set.
   - For each survivor: Grit refilled to `grit_max`, +1 if under max-3 cap (per SRD).
   - For each trooper who **ended Wounded** OR **was BleedingOut** at any point: `recovering = true`.
   - REQ award if enabled.
   - Campaign `currentMissionId = null`.
6. View → HQ. Mission History card shows the new entry.

### Recovering auto-clear

When a new mission deploys: any trooper not in the deploying squad has `recovering` cleared automatically (they sat out). Troopers in the deploying squad keep `recovering=true` only via manual override in the deploy modal (confirm dialog: "Override recovery? Trooper has not recovered.").

## UI / Nav Changes

### Sidebar (desktop, tree)

```
[+ NEW CAMPAIGN]
▼ Campaign 1
     HQ
     Barracks
     Armoury
     Mission [LIVE]      ← only when status=live
▶ Campaign 2
──────────────
Settings
```

The Mission Builder is **not a top-level nav entry**. It's reached via HQ — "+ NEW MISSION" opens a fresh Builder, and Available Missions cards have an "EDIT" button that opens the Builder pre-populated. The Builder is its own full-screen view (not a modal — the form is too large), but it sits inside the HQ tab conceptually. When open, the sidebar/bottom-nav highlights HQ.

`Mission` only appears in the sidebar when a mission is live (`status='live'`); otherwise hidden.

### Mobile bottom tabs

4 tabs: HQ / Barracks / Armoury / Mission. The Mission Builder lives inside HQ — open it via "+ NEW MISSION" or "EDIT" on a mission card. `Mission` tab is hidden when no mission is live; HQ becomes the default landing tab in that case.

### View enum

```ts
export type View = 'hq' | 'barracks' | 'armoury' | 'mission' | 'builder' | 'settings'
```

`'builder'` is a view but not a nav target — entered only via HQ buttons. The active nav highlight stays on `'hq'` while `'builder'` is open.

## Files Changed / Created

**Modified frontend:** `src/types.ts`, `src/store/index.ts`, `src/App.tsx`, `src/utils/gameRules.ts`, all `t.active` call sites (~20 files), `src/views/Barracks/Barracks.tsx`, `TrooperCard.tsx`, `TrooperEditor.tsx`, `src/views/MissionBoard/MissionBoard.tsx`, `CatchBreathPanel.tsx`, `MissionCompletePanel.tsx`, `AdvanceRollPanel.tsx`, `SectorChainStrip.tsx`, `SectorEditorModal.tsx` (gains REACTIVATE flow on cleared sectors), `SectorHeader.tsx`, `src/views/HQ/HQ.tsx`, `src/views/Armoury/Armoury.tsx`, `src/api/sync.ts`, `src/api/client.ts`.

**New frontend:** `src/views/Barracks/SquadEditor.tsx`, `src/views/MissionBoard/DeployConfirmModal.tsx`, `src/views/MissionBoard/DetermineSectorPanel.tsx`, `src/views/MissionBoard/BoonResolver.tsx`, `src/views/MissionBoard/AddSectorModal.tsx`, `src/views/MissionBoard/EndMissionModal.tsx`, `src/views/MissionBuilder/MissionBuilder.tsx`, `src/views/MissionBuilder/SectorBlueprintCard.tsx`, `src/views/HQ/MissionSummaryCard.tsx`, `src/views/HQ/FieldReportPanel.tsx`, `src/views/Armoury/GearGrid.tsx`, `src/views/Armoury/PurchaseConfirmDialog.tsx`.

**Modified server:** `server/src/db.ts`, `server/src/routes/campaigns.ts`, `server/src/routes/bootstrap.ts`, `server/src/middleware.ts`.

**New server:** `server/src/routes/squads.ts`, `server/src/routes/missions.ts`, `server/src/routes/req.ts`, `server/src/migrations/002_stage2.sql`.

**Updated tests:** `tests/gameRules.test.ts` (fixtures: squadId, mission shape change), `tests/store.test.ts` (squad mutators, deploy, complete, recovering auto-clear), `server/tests/missions.test.ts` (deploy/complete/state flow), `server/tests/squads.test.ts`, `server/tests/req.test.ts`.

## Implementation Order (suggested)

This spec is large; implementation should land in self-contained PRs:

1. **Data model + server schema** — types.ts, schema migration, GET/PATCH campaign extended, squads table+routes, missions table+routes (no UI yet, tests).
2. **`active` → `isDeployed` migration** — pure refactor; all call sites updated; tests still green.
3. **Squads UI in Barracks** — SquadEditor, squad list, sergeant assign, recovering badge.
4. **Mission Builder** — form + sector blueprint editor; saves blueprints.
5. **HQ page** — overview cards + Available Missions + Mission History.
6. **Deploy flow** — DeployConfirmModal, deploy endpoint wiring, view jump.
7. **DetermineSectorPanel + Nothing/Boon paths** — runner phase machine update; AddSectorModal.
8. **EndMissionModal + after-mission flow** — REQ award, recovering flags, Field Report.
9. **Armoury page** — REQ display/edit, gear purchase.
10. **Mobile nav update** — 5 tabs + Builder icon.

Each step ends green tests + manual smoke. Step boundaries are good review checkpoints.

## Testing Strategy

### Unit (Vitest)

- `isDeployed(trooper, mission)` matrix — deployed/non-deployed/no-mission/wrong-squad.
- `applyAfterMission(mission, troopers)` — survivor Grit, recovering flags, REQ award. Edge: Wounded-at-end vs ever-BleedingOut vs both.
- BoonResolver applicators — ammo cache cap at `ammo_max`, enemy intel sets+clears, fallen friendlies modal yields, rookies added to pending forces.
- DetermineSectorPanel state machine — Nothing branch sets cleared+empty+catch_breath without engagement; Boon branch routes through resolver; TL branch transitions to advance.
- Recovering auto-clear logic on deploy.

### Server (Vitest)

- Squad CRUD + member assignment cap (5).
- Mission CRUD; PATCH only allowed on blueprint.
- Deploy: status transition; member reset; campaign currentMissionId.
- Complete: REQ award; recovering flags; status transition; campaign clearance.
- REQ spend atomic — concurrent spend doesn't go negative.

### E2E (manual smoke)

End-to-end story per the verification section below.

## Verification

Manual in-browser, against a fresh dev environment (`cd server && npm run dev` + `npm run dev` from root). Use the existing auth flow.

1. Create campaign. Toggle REQ on; set default airspace = Contested.
2. Create 7 troopers. Create two squads (A, B). Assign 5 to A, 2 to B. Set sergeants on both.
3. Open Mission Builder. Create a Hit & Run / Raid mission, Hazardous, with: 1 LZ (predetermined), 2 standard sectors (undetermined), 1 Objective (predetermined), 1 EZ (predetermined). Air insertion both ends. Stealth start ON. Save blueprint.
4. HQ shows the blueprint in Available Missions. Click → summary → DEPLOY → choose Squad A → confirmation modal lists 5 troopers → DEPLOY.
5. Mission view: SectorHeader shows LZ; phase = `advance`. Run advance roll, run engagement (or bypass), reach catch breath. Advance to next sector — undetermined sector → DetermineSectorPanel: roll Cover, Space, weather pre-filled, roll Contents.
   - Force a "Nothing" outcome (re-roll if needed) → expect: sector marked cleared+empty, no engagement, straight to catch breath with banner.
   - On the second undetermined sector force a Boon "Ammo Cache" → all deployed troopers receive +1 ammo (capped).
6. Mid-mission ADD NEXT SECTOR via CatchBreathPanel — name/role/description only — leaves contentsState=undetermined. Advance — DetermineSectorPanel fires.
7. Reach Objective sector, win engagement, advance to EZ, end mission. EndMissionModal: outcome=Victory, field report text "first run". Confirm.
8. HQ Mission History shows the completed mission. REQ pool = +5 (5 survivors).
9. Wound a trooper before mission end (force scenario), end mission — that trooper's `recovering` flag set. In Barracks the trooper has the recovering badge; squad assignment dropdown disables them.
10. Deploy a new mission with Squad B (different squad) — recovering trooper auto-clears (they sat out).
11. Armoury: REQ pool shows 5. Edit pool to 3. Buy a Marksman Rifle (reqcost X) for a Squad B trooper — REQ deducts atomically, trooper's weapon updates.
12. Refresh page — all state persists from server.
13. `npx vitest run` (root) and `cd server && npm test` — all green.

## Critical files reference

- Existing `t.active` predicates: `src/store/index.ts:157,413,431,444,707,711,718,756`; `src/utils/gameRules.ts:24,113,126,196`.
- Existing `clearAndAdvanceMission` helper — reused for Nothing/Boon paths.
- Existing `resetTrooperForMission` — called from new deploy endpoint.
- Existing `SectorEnteredBanner`, `AdvancePreview`, `SectorHeader` — keep, integrate with new contentsState.
- Stage 1 plan: `/Users/michael/.claude/plans/if-i-wanted-to-giggly-yao.md`.
- Stage 1 architecture summary: `~/.claude/projects/<…>/memory/v2_architecture.md`.

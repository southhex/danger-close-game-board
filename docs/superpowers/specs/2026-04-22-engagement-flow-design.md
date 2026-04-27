# Engagement Flow + Sector Chain — Design Spec

**Date:** 2026-04-22  
**Status:** Approved, ready for implementation  
**Implementation plan:** `/Users/michael/.claude/plans/so-the-final-major-crystalline-truffle.md`

---

## Context

The mission board handles advance rolls and mobility checks but stops there. This feature adds the full engagement resolution loop — the last major V1 piece needed to make the board usable for real play sessions. It also replaces the single-sector model with a navigable sector chain.

**SRD reference:** https://lars1808.github.io/DANGER-CLOSE-SRD/  
Chapters reviewed: `04-engagement.md`, `05-exchange.md`, `06-hard-targets.md`, `07-equipment-and-gear.md`, `03-mission-phase.md`

---

## Layout

The mission board becomes phase-aware. Three phases: `advance | engagement | catch_breath`.

```
┌─────────────────────────────────────┐
│  SECTOR CHAIN STRIP                 │  always visible
│  [LZ] → [Alpha] → [Bravo ●] → [+]  │  chips show: Name C[x]/S[x]/TL[x]
├─────────────────────────────────────┤
│  ACTIVE PHASE PANEL                 │  swaps per phase:
│  · advance      → AdvanceRollPanel  │  (existing)
│  · engagement   → EngagementPanel   │  (new)
│  · catch_breath → CatchBreathPanel  │  (new)
├─────────────────────────────────────┤
│  Sector Momentum  │  Mission Notes  │  always visible (existing)
├─────────────────────────────────────┤
│████ TROOPER CARD DOCK (sticky) █████│  always visible (existing)
└─────────────────────────────────────┘
```

**Phase transitions:**
- Advance roll resolves non-OVERWHELM, sector not bypassed → `engagement`
- Engagement ends (victory / defeat / disengage) → `catch_breath`
- Catch Breath "Advance" → next sector active → `advance`

---

## Sector Chain

`MissionState.sector` is replaced by `sectors: MissionSector[]` + `activeSectorId: string`.

- Each sector chip displays: **name** + `C[x]/S[x]/TL[x]` notation + TL badge + status dot
- Active sector highlighted with accent green border
- Tap chip → edit modal (name, cover, space, TL, weather)
- `+` chip → add sector modal
- Sectors have `status: 'pending' | 'active' | 'cleared'`
- Sector notation also shown in active phase panel header for constant reference

---

## Exchange Step Wizard

After advance roll resolves, **Begin Engagement** starts the exchange loop. A step indicator shows: `INTENT → OFFENSE → DEFENSE → MOMENTUM → TACTICS`. Cycles until engagement ends.

### Step 1 — INTENT

Per-trooper row: name, offpos/defpos badges, suppressed badge, intent selector.

**Suppressed troopers:** Fire and Covering Fire greyed out.

| Intent | UI behaviour |
|---|---|
| **Fire** | Auto-calculates ATK (breakdown shown). Ammo spend stepper. Hard Target redirect toggle if HTs present. |
| **Move** | Modal: sub-action (Move Up / Fall Back / Reposition), resulting position shown, mobility check (roll in app or input), Grit reroll button. Applies position on confirm. |
| **Covering Fire** | Target picker modal. Selected trooper gets live +1 DEF badge. Stackable. |
| **Use Special Gear** | Gear-specific modal (see Active Gear table). |
| **Interact** | Text note + Demo Charges flow if applicable. |
| **Disengage** | Whole squad. ConfirmDialog shows injury odds by momentum. Resolves per trooper. |
| **Improvise** | Text note only. |

Running squad ATK total shown at bottom of step.

### Step 2 — OFFENSE ROLL

- ATK pool table: trooper | intent | contribution
- Hard target sub-pools shown separately (one per target)
- Modifiers: +1 momentum last exchange, +1 trooper died, −N pressure, −N Pinned Down
- Attached force commit toggle + attrition dice
- Roll in app (logged to dice history) OR enter result
- Outcome: **Pushed Back / Hold Position / Success at Cost / Success**
- 4–5: player chooses which applies
- 6 with sixes ≥ TL+1: +2 Momentum total
- Hard target hit resolution: 6 = Hit, 4–5 = Hit at Cost (optional, assigns −1 DEF to one trooper)

### Step 3 — DEFENSE ROLL

Per-trooper cards. DEF pool = base 1 + armor + covering fire bonus + this-exchange modifiers.

- Bleeding Out troopers flagged (no roll; die next exchange if not stabilised)
- Roll or input per trooper
- Table lookup: Flanked/In Cover/Fortified × roll → Safe or Direct Fire
- **Direct Fire:** "Suffer Injury" (roll/input count per TL) or "Go Suppressed"
- Suppressed troopers who fail again → must take Injury (cannot suppress twice)
- **Final Stand mode** (SaC pushes Momentum to VICTORY): Suppressed option disabled for all

### Step 4 — MOMENTUM

Auto-resolves delta from offense result.

- **Gain:** Flanking troopers → Stay Flanking (−1 DEF next exchange) or move to Engaged. Fortified troopers → become Limited or Engaged+InCover.
- **Loss:** Flanked troopers flagged must-Fall-Back next exchange (or accept −1 DEF).
- Confirm button advances.

### Step 5 — ENEMY TACTICS

- Natural d6 ≥ 4 → Pressure +1 (auto, shown before roll)
- Roll 1d6 + TL (roll in app or input natural d6 and total separately; logged)
- Tactic displayed with full description
- Guided apply:

| Roll total | Tactic | App behaviour |
|---|---|---|
| 2–4 | None | Auto-dismiss |
| 5 | Reposition | Pick Flanking trooper (or random button) → move to Engaged |
| 6 | Scatter | Pick trooper → flagged must-Move next exchange |
| 7 | Pinned Down | Auto-applies −2 ATK next exchange |
| 8 | Encircle | Apply button: all Fortified → In Cover |
| 9 | Push Forward | Apply button: all defensive positions drop one step |
| 10 | Fall Back | Apply button: all offensive positions drop one step |

- **Nullify Tactic:** trooper picker (not bleeding out, not suppressed), spends 1 Grit. Pressure increase still occurs.
- **Next Exchange** loops. **End Engagement** exits.

---

## DEF Modifier Lifecycle

Two buckets, both on `EngagementState`:

- **`thisExchangeModifiers`** — covering fire bonuses, HT DEF hits, SaC penalty. **Cleared at exchange start.**
- **`nextExchangeModifiers`** — Stay Flanking −1 DEF ids, Pinned Down −2 ATK, must-Move ids, Flanked-must-Fall-Back ids. **Applied at exchange start, then cleared.**

---

## Suppressed Lifecycle

1. Exchange start: if trooper is currently Fortified → suppressed clears before Intent
2. Intent step: Fire and Covering Fire disabled for suppressed troopers
3. Defense step: suppressed trooper passes roll → suppressed clears
4. Defense step: suppressed trooper fails roll again → must take Injury (cannot suppress twice)

---

## Hard Targets

Added via engagement panel header. Each has name, type, HP pips.

| Type | HP | DEF effect | Notes |
|---|---|---|---|
| Brute | 1 | −1 DEF to 2 troopers | — |
| Sniper | 1 | −2 DEF to 1 trooper | Prefers Flanked targets |
| Grenadier | 1 | −2 DEF to 1 trooper | Prefers Fortified targets |
| Gun Nest | 2 | −1 DEF to 1 trooper | Prefers Flanking targets |
| Tank | 4 | −1 DEF to all | Every other exchange; `isGround: true` |

DEF hits auto-suggested by position preference; player confirms. HT destroyed when HP = 0.

**Pressure** shown as a pseudo-HT counter in the header. Absorbs ATK hits (each hit −1 Pressure). Max = TL+1. Resets between engagements.

---

## Attached Forces

Added via engagement panel. Name + size (Small=1 / Medium=2 / Large=3 ATK dice).

- Committed during Offense step: dice rolled alongside but separately
- Any die showing 1 is removed permanently (casualties)
- VIP flag: last die; rolled 1 = VIP killed (narrative note shown)
- Force removed when all dice gone

---

## Active Gear Resolution

**Passive weapon modifiers** (auto-applied on Fire intent):

| Weapon | Modifier |
|---|---|
| Carbine | +1 ATK if Engaged + Space 0 (Tight); −1 ATK if Engaged + Space 2 (Open) |
| Marksman Rifle | +1 ATK if Engaged + Cover 0 (Exposed); −1 ATK if Engaged + Cover 2 (Dense) |
| Sniper Rifle | +1 ATK if Fortified; +1 more if Fortified and didn't Move last exchange |
| HMG (passive) | +1 ATK if Fortified |
| LMG (passive) | +1 additional DEF to recipient of Covering Fire |

**Active gear** (shown as Use Special Gear intent options, contextually):

| Gear | Intent label | Mechanic |
|---|---|---|
| Utility Kit | Use: Smoke / Flashbang / Flare | 1 ammo each. Flashbang disabled if Space ≠ 0. Flare: outdoor only, aerial strike, +2/3/4 ATK by sky conditions, all Flanked check mobility or injury. |
| HMG (active) | Use: HMG Covering Fire | Multi-trooper picker (up to 3), 1 ammo total |
| Grenade Launcher | Use: Grenade | Pick Hard Target (1 Hit) or ally target (Flanking benefit next offense). 1 ammo per grenade. |
| Rocket Launcher | Use: Rocket | +3 ATK or 2 Hits on HT. Single use; pip consumed. |
| Plasma Rifle | Use: Plasma Rifle | Roll 1d6 or input. No ammo. Table: 1=+2 injury+destroy; 2–3=+1 injury+1 ATK; 4–5=+2 ATK or 1 HT Hit; 6=+3 ATK or 2 HT Hits. |
| Radio Gear | Use: Artillery Strike | Roll 1d2 ETA (exchanges). Once per mission. If engagement ends before strike: cancel or move clear (no friendly injury). On fire: +2 Momentum, all ground HTs destroyed, all troopers Mobility Check or 1d3 injury. |
| Jump Pack | Reposition (Jump Pack) | Free position picker (any offpos + defpos). Pip consumed. Once per engagement; resets on Catch Breath advance. |
| Demo Charges | Interact: Place Charges | Only if Momentum ≥ GAINING GROUND. 2-exchange commit: exchange 1 auto-applies Move Up, exchange 2 sets charges. |

---

## Catch Breath Phase

Appears after Victory / Disengage / Defeat retreat.

- Trooper status grid (name, status, grit, ammo)
- Grazed → OK auto-applied on mount (notice shown)
- Bleeding Out troopers: "Stabilise" (Medic Gear required) or "Lost" (mark dead)
- Medic Gear: trooper picker, Wounded → OK
- Supply Backpack: ammo transfer stepper between troopers
- Pending radio strike: "Fire Now" / "Cancel" / "Move Clear" (no friendly injury)
- **"Advance to Next Sector"** → activates next sector, resets phase to `advance`, clears pressure, resets Jump Pack pips, resets advance_rolls

---

## Data Model Changes

### `src/types.ts`

```ts
interface MissionState {
  id: string
  name: string
  sectors: MissionSector[]        // replaces single sector
  activeSectorId: string
  momentum: number                // -3 to +3
  advance_rolls: number
  stealth: boolean
  notes: string
  phase: 'advance' | 'engagement' | 'catch_breath'
  engagement: EngagementState | null
}

interface MissionSector {
  id: string
  name: string
  cover: 0 | 1 | 2
  space: 0 | 1 | 2
  tl: 1 | 2 | 3 | 4
  weather: -2 | -1 | 0 | 1
  status: 'pending' | 'active' | 'cleared'
}

interface EngagementState {
  exchangeNumber: number
  step: 'intent' | 'offense' | 'defense' | 'momentum' | 'enemy_tactics'
  pressure: number
  hardTargets: HardTarget[]
  attachedForces: AttachedForce[]
  intents: Record<string, TrooperIntent>
  offenseResult: OffenseResult | null
  defenseResults: Record<string, DefenseResult>
  pendingTactic: EnemyTactic | null
  radioStrikeCountdown: number | null
  nextExchangeModifiers: NextExchangeModifiers
  momentumGainedLastExchange: boolean
  trooperDiedLastExchange: boolean
  trooperMovedLastExchange: Record<string, boolean>
  tankActsThisExchange: boolean
}

interface NextExchangeModifiers {
  atkPenalty: number
  flankingDefPenalty: string[]    // trooper ids staying Flanking → -1 DEF next exchange
  mustMove: string[]              // trooper ids flagged by Scatter
  flankedMustFallBack: string[]   // trooper ids flagged by Momentum Loss
}

interface HardTarget {
  id: string
  type: 'brute' | 'sniper' | 'grenadier' | 'gun_nest' | 'tank'
  name: string
  maxHp: number
  currentHp: number
  isGround: boolean               // destroyed by Radio strike
}

interface AttachedForce {
  id: string
  name: string
  dice: number                    // remaining dice (attrition removes 1s)
  isVip: boolean
  committed: boolean
}

interface TrooperIntent {
  action: 'fire' | 'move' | 'covering_fire' | 'special_gear' | 'interact' | 'disengage' | 'improvise'
  atkContribution: number         // calculated total ATK for this trooper
  hardTargetId?: string           // ATK redirected to specific HT
  ammoSpent: number
  moveType?: 'move_up' | 'fall_back' | 'reposition'
  mobilityRoll?: number
  mobilityPassed?: boolean
  coveringFireTargets?: string[]  // trooper ids
  gearAction?: string             // 'smoke' | 'flashbang' | 'flare' | 'rocket' | 'plasma' | 'radio' | 'jump_pack' | 'demo' | 'grenade_ht' | 'grenade_flanking' | 'hmg_cover'
  gearTargets?: string[]          // trooper or hard target ids
  note?: string
}

interface OffenseResult {
  roll: number
  outcome: 'pushed_back' | 'hold_position' | 'success_at_cost' | 'success'
  chosenOutcome?: 'hold_position' | 'success_at_cost'
  momentumDelta: number
  sacPenaltyTrooperId?: string
  hardTargetResults: Record<string, { hits: number; atCost: boolean }>
}

interface DefenseResult {
  roll: number
  outcome: 'safe' | 'direct_fire'
  resolution?: 'injury' | 'suppressed'
  injuryCount?: number
}

type EnemyTactic = 'none' | 'reposition' | 'scatter' | 'pinned_down' | 'encircle' | 'push_forward' | 'fall_back'
```

### `src/data/gear.ts` additions

Weapon property metadata for auto-calc:
- Carbine: `spaceBonus: { tight: 1, open: -1 }`
- Marksman Rifle: `coverBonus: { exposed: 1, dense: -1 }`
- Sniper Rifle: `fortifiedBonus: 1, notMovedBonus: 1`
- HMG: `fortifiedBonus: 1`
- LMG: `coveringFireBonus: 1`

---

## New Components

```
src/views/MissionBoard/
  SectorChainStrip.tsx
  SectorEditorModal.tsx
  EngagementPanel.tsx
  IntentStep.tsx
  OffenseStep.tsx
  DefenseStep.tsx
  MomentumStep.tsx
  EnemyTacticsStep.tsx
  CatchBreathPanel.tsx
  MoveModal.tsx
  CoveringFireModal.tsx
  GearActionModal.tsx
  HardTargetPanel.tsx
  AttachedForcePanel.tsx
```

---

## Verification Checklist

1. `npm run typecheck` passes after types update
2. Migration: `mission.sector` → `sectors[0]` without data loss; `phase: 'advance'` set
3. Sector chain: add/edit/delete sectors; notation displays correctly; constraints propagate
4. Full exchange loop: one complete exchange through all 5 steps, DEF modifiers clear correctly
5. Suppressed lifecycle: greyed-out Fire → Fortified clears → second fail forces Injury
6. SaC-to-VICTORY: Final Stand Defense step (no Suppressed option)
7. All active gear flows work end-to-end
8. Hard Targets: Tank skips every other exchange; Sniper suggests Flanked target; HP tracks to 0
9. Catch Breath: Grazed clears, Medic heals, Jump Pack pip resets on advance
10. All in-app rolls appear in dice history with correct labels

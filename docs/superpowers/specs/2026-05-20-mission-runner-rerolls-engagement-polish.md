# Mission Runner — Rerolls & Engagement Polish

**Date:** 2026-05-20
**Scope:** Mission Runner only (`src/views/MissionBoard/`)
**SRD basis:** v0.97.0 — chapters 01 (Squad/Grit), 04 (Mission Phase / Press the Advance), 06 (Exchange / rerolls / nullify tactic), 07 (Hard Targets)

## Goals

1. Make every grit-spend the SRD defines actually work in the app, including the two currently-broken rerolls.
2. Polish the engagement flow so steps are navigable, the offense pool split is legible, and key state (sector header, pressure, momentum) stays visible.
3. Show the full SRD hard-target detail on hard-target cards so players don't need the rulebook open.

## Out of scope

- Layout overhaul (two-column / context rail) — deferred.
- Density / typography pass — deferred.
- Uniformity primitives (`<MissionPanel>`, `<Badge>`, button tiers) — deferred.
- New hard-target levers beyond SRD detail (ATK/DEF/behavior) — explicitly rejected.
- Offense / Enemy-Tactics dice rerolls — not in SRD.
- Sector roadmap promotion / mid-mission "add sector" — deferred.

## SRD reference (verbatim, for traceability)

> **Grit.** "An expendable resource that allows a Trooper to push through. Can be used to re-roll a Move or Defense Roll, spent on the Press the Advance action, or used for special skills." (ch. 01)

> **Move.** "Make a Mobility Check. Grit can be used to reroll." (ch. 06)

> **Defense.** "Spend 1 Grit to reroll 1d6. You must take the new result." (ch. 06)

> **Press the Advance.** "After making the Advance Roll, the Squad may push the result higher by spending Grit. Each Trooper may contribute 1 Grit, granting +1 to the result, to a maximum of +5 from a full Squad. All Grit is declared and spent together. The new result is final." (ch. 04)

> **Nullify Tactic.** "Your Squad's Sergeant, if not Bleeding Out or Suppressed, can nullify a Tactic at the cost of 1 Grit." (ch. 06)

> **Hard Targets table.** See ch. 07 — HP / Damage / Notes per type.

**Reroll policy:** "Take the new result" binds the latest roll but does not cap rerolls; a trooper may spend grit again on a freshly-rolled die as long as they have grit.

## Features

### 1 · Grit reroll on Move (fix existing bug + lift cap)

**File:** `src/views/MissionBoard/MoveModal.tsx`

- Decrement `trooper.grit` by 1 on every reroll click (currently does not — bug).
- Remove the `rerolled` boolean latch so a trooper can reroll repeatedly as long as `grit > 0`.
- Button stays inline beneath the result, immediate; label: `REROLL (1 GRIT — N LEFT)`.
- Disabled state with grey text when `grit === 0`.
- Log each reroll to dice history as today.

Use the same `updateTrooper(trooper.id, { grit: trooper.grit - 1 })` pattern used elsewhere in the codebase.

### 2 · Grit reroll on Defense (add)

**File:** `src/views/MissionBoard/DefenseStep.tsx`

- Per-trooper defense card already exists. Add an inline reroll button below the rolled/entered result, before the outcome resolution buttons.
- Button immediate-action: spend 1 grit from this trooper, roll a single new d6, replace the current `rolledResults[trooper.id]`. Append to dice history with label `Exchange N — Defense Reroll (TrooperName)`.
- Repeatable while `trooper.grit > 0`. No latch.
- Label: `REROLL (1 GRIT — N LEFT)`.
- Disabled when grit is 0 or trooper is already resolved.

Note: armor +/−1 modifier already applies via `defRollOutcome`. Rerolling raw d6 is fine — the outcome computation continues to layer armor on the new die.

### 3 · Grit reroll on Mobility Check (fix free reroll)

**File:** `src/views/MissionBoard/MobilityCheckPhase.tsx`

- The plain `re-roll` link beside each result currently has no grit gate and no cost.
- Replace it with a `REROLL (1 GRIT — N LEFT)` button, same pattern as Move & Defense: decrement `trooper.grit`, roll new d6, replace result, log to dice history.
- Disabled when `trooper.grit === 0`.
- Repeatable while grit > 0.

### 4 · Press the Advance (add)

**File:** `src/views/MissionBoard/AdvanceRollPanel.tsx`

After the 2d6 is rolled but before the player commits to "CONTINUE TO MOBILITY CHECKS", insert a Press-the-Advance step inline (no modal):

- Block header: `PRESS THE ADVANCE — OPTIONAL`
- One row per **deployed** trooper showing: name, grit pips, +/− toggle button (0 or 1 grit contribution). Disabled toggle when `trooper.grit === 0`. Bleeding-Out troopers excluded (can't contribute).
- Running tally line: `+N grit committed → new result: ORIG + N = NEW (RESULT_NAME)`.
- Hard cap: total contributions ≤ 5 (UI prevents further +).
- Two buttons:
  - `SKIP — KEEP RESULT` (no grit spent; proceeds to existing mobility flow with original result).
  - `COMMIT GRIT — APPLY +N` (binding; decrements each selected trooper's grit by 1, recomputes `advanceResult(newTotal)`, replaces the rolled-state result, then renders the standard "CONTINUE TO MOBILITY CHECKS" button using the new result).
- Logging: a single dice-history entry `Press the Advance` with results = the list of contributing trooper ids, modifier = +N, total = NEW.
- After commit, this block is replaced by a small note: `PRESSED +N → NEW (RESULT_NAME)`.
- If `result === 'overwhelm'` already, the Press block can still appear (no-op effectively, but cleaner just to hide it since you can't exceed Overwhelm).

Implementation note: this is local component state until COMMIT — same shape as the existing `phase: 'rolled'` data, just with an extra `pressContributions` map and a derived new total.

### 5 · Nullify Tactic — gate to Sergeant + not BO/Suppressed (fix)

**Files:** `src/views/MissionBoard/EnemyTacticsStep.tsx`, `src/store/index.ts` (`nullifyTactic`)

Per SRD: only the Squad's Sergeant may nullify a tactic, and only if not Bleeding Out or Suppressed.

- Replace the trooper picker `<select>` with a single fixed "NULLIFY (1 GRIT — SERGEANT)" button.
- Sergeant is resolved from `mission.squadId` → `squads.find(s => s.id === missionSquadId).sergeantId`.
- Button is disabled (with reason hint) when:
  - No sergeant set on squad, OR
  - Sergeant is not deployed (shouldn't happen mid-mission but guard anyway), OR
  - Sergeant `status === 'bleedingout'`, OR
  - Sergeant `suppressed === true`, OR
  - Sergeant `grit === 0`.
- Hint text under disabled button gives the reason: e.g. `Sergeant suppressed`, `Sergeant has no grit`, etc.
- Store: `nullifyTactic` should additionally validate the passed trooperId IS the sergeant of the mission's squad; if not, no-op. Belt-and-braces alongside the UI gate.

### 6 · Engagement step strip — clickable back-navigation

**File:** `src/views/MissionBoard/EngagementPanel.tsx`

- Step strip badges (`INTENT / OFFENSE / DEFENSE / MOMENTUM / TACTICS`) become buttons.
- Clicking a *prior* step (one whose phase the engagement has passed) re-renders that step's sub-component so the player can refer back to rolls/intents/results.
- The current step keeps its `border-warn` highlight; passed steps are shown with a different accent (e.g. `border-ok` muted).
- Future steps (not yet reached) remain non-clickable / muted as today.
- Going back is **read-only in practice** — passed sub-steps render from resolved engagement state (`intents`, `offenseResult`, `defenseResults`, `enemyTactic`). Their interactive controls are gated on absence of resolved data today, so they naturally show as "done" with no need for an extra read-only flag.
- Implementation: `setExchangeStep` already exists in the store and just sets `engagement.step`. Reuse it.
- Step "passed" predicate (drives clickability):
  - `intent` passed when any trooper has an intent recorded.
  - `offense` passed when `engagement.offenseResult !== undefined`.
  - `defense` passed when every non-BO trooper has a `defenseResults[id]`.
  - `momentum` passed once `enemy_tactics` step has been entered (i.e. `eng.step === 'enemy_tactics'` or beyond).
- Future steps not yet passed: muted, non-clickable.
- Returning to "live" step: clicking the strip's current-live step (the furthest-passed one) is allowed and is the standard way back.

Decision: do NOT add a separate "← BACK" button per step. The strip is the single nav affordance.

### 7 · Defense — ROLL ALL batch

**File:** `src/views/MissionBoard/DefenseStep.tsx`

- Add a top-of-panel button `ROLL ALL DEFENSE DICE`.
- Iterates every non-bleeding-out, non-resolved trooper and runs the same logic as the per-trooper `handleRollInApp` (computes pool, rolls, stores highest, logs to dice history).
- Skips troopers who already have a `rolledResults[t.id]` or `inputResults[t.id]` (don't clobber a value the player entered manually).
- Outcome resolution (SAFE / SUFFER INJURY / GO SUPPRESSED) remains per-trooper manual — this batch button only fires dice.
- Disabled if no eligible troopers remain.

### 8 · Offense — split squad pool vs hard-target pools visually

**File:** `src/views/MissionBoard/OffenseStep.tsx`

Today the ATK table mixes normal rows and HT rows with a warn caption between. Split into discrete card sections:

- `SQUAD POOL` card: trooper rows whose intent is Fire (and not redirected to a HT) + the modifiers block + the squad roll input.
- One `HARD TARGET POOL — <ht.name>` card per HT being targeted, listing the contributing troopers, the d6 count for that pool, and the per-HT resolve buttons (HIT / HIT AT COST / MISS — already exists).
- The squad pool's outcome and momentum apply to the engagement; HT pools resolve damage on the HT independently and do not affect momentum (matches current behavior).
- Visual separation: each pool gets its own bordered card, not a shared table.

### 9 · Pin SectorHeader inside engagement (sticky)

**File:** `src/views/MissionBoard/EngagementPanel.tsx`

- The engagement panel header includes `<SectorHeader>` + exchange # + momentum + pressure (all on one row already).
- Make this header `sticky top-0 z-10 bg-surface` inside the engagement panel's scroll container so it stays visible during long defense / offense scrolling.
- Verify it doesn't conflict with the existing `TrooperCardDock` (bottom sticky) — they're on opposite edges.

### 10 · Pressure visualization

**File:** `src/views/MissionBoard/EngagementPanel.tsx`

- Current: tiny `N/CAP` number with two arrow buttons.
- Change: simple inline horizontal bar — `CAP` square segments side-by-side, the first `pressure` filled. Color shifts to `bad` when filled count equals cap. Numeric `N/CAP` printed to the right of the bar. +/− buttons stay flanking, same as today.
- Inline implementation in `EngagementPanel.tsx` — no shared component yet; if the pattern repeats elsewhere later, extract then.

### 11 · Enemy Tactics — collapsed tactic reference

**File:** `src/views/MissionBoard/EnemyTacticsStep.tsx`

- Add a `▾ TACTIC TABLE` collapsible at the top of the step (default collapsed), showing the 1d6 + TL → tactic mapping and a one-line description of each outcome (reuse existing `TACTIC_DESCRIPTIONS` / `TACTIC_LABELS` constants).
- Mirrors the existing pattern in `AdvanceRollPanel`'s `▾ RESULT TABLE`.

### 12 · Hard Target card — show full SRD detail

**File:** `src/views/MissionBoard/HardTargetPanel.tsx`

Each HT row should display, alongside name + HP pips + HIT button:

- **Damage line** (verbatim from SRD): e.g. `−1 DEF to 2 Troopers` (Brute), `−2 DEF to 1 Trooper` (Sniper), etc.
- **Notes line** when present: `Prefers Flanked targets`, `Prefers Fortified targets`, `Prefers Flanking targets`, `Mobile. Attacks every other Exchange.` for Tank.
- **GROUND** badge stays for Tank (already implemented).

Add a shared constant `HT_DAMAGE[type]` and `HT_NOTES[type]` to `src/utils/gameRules.ts` (or a new `src/data/hardTargets.ts`) so the strings have a single source of truth. Match the SRD wording exactly.

Layout: damage line under the name (small text, muted-ink), notes line under that in italic muted. Existing single-row inline layout becomes a two- or three-line row card; keep within the same border, no new card primitive needed.

This is display-only — no data model changes, no new behavior. `HardTarget` interface stays as-is.

## Data model changes

None. All four reroll / press-the-advance features mutate existing `Trooper.grit` via the existing `updateTrooper` action. Engagement step navigation uses existing `setExchangeStep`. HT card detail is a static lookup.

## Store / action changes

- `nullifyTactic` (existing): add server-side validation that the trooper is the sergeant of the mission's current squad (no-op if not). Grit decrement and pendingTactic clear logic stays the same.
- New action: `pressTheAdvance(contributions: Record<trooperId, 1>, newResult: AdvanceResult)` — atomically decrements grit on each contributing trooper and (optionally) updates the engagement's recorded advance result if we store it on `MissionState`. (We may not need to store the result on state; the panel can recompute and just call `applyAdvanceResult` with the new result when CONTINUE is clicked.) Decision: prefer keeping it local to the panel — just decrement grit and pass the new `result` value to `applyAdvanceResult`/`beginEngagement` chain. Avoid a new store action.

## Component-level summary

| File | Changes |
|---|---|
| `MoveModal.tsx` | Decrement grit on reroll; remove `rerolled` latch; update button label |
| `MobilityCheckPhase.tsx` | Replace free re-roll link with grit-cost reroll button |
| `DefenseStep.tsx` | Add per-trooper inline reroll button; add `ROLL ALL` batch button |
| `AdvanceRollPanel.tsx` | Insert Press-the-Advance step between roll and continue |
| `EnemyTacticsStep.tsx` | Replace picker with sergeant-only nullify button + disable hints; add collapsible tactic table |
| `EngagementPanel.tsx` | Make step strip clickable for back-nav; sticky header; pressure bar |
| `OffenseStep.tsx` | Split squad pool and HT pools into discrete cards |
| `HardTargetPanel.tsx` | Show damage + notes lines per HT |
| `store/index.ts` (`nullifyTactic`) | Server-side sergeant validation |
| `gameRules.ts` or new `data/hardTargets.ts` | `HT_DAMAGE` and `HT_NOTES` constants |

## Testing

Update / add vitest cases in `tests/`:

- `MoveModal`: spending grit decrements; can reroll multiple times; disabled at 0 grit.
- `MobilityCheckPhase`: same.
- `DefenseStep`: per-trooper reroll decrements correct trooper; batch ROLL ALL fires only for unresolved non-BO troopers and skips manually-entered values.
- `AdvanceRollPanel`: Press the Advance — UI contributions capped at 5; commit decrements grit on each contributing trooper; new result re-derives from the new total via `advanceResult()`; skip path leaves grit untouched.
- `EnemyTacticsStep`: nullify button enabled only when sergeant present, deployed, not BO, not suppressed, grit ≥ 1; store `nullifyTactic` rejects non-sergeant trooperId.
- `EngagementPanel`: step strip click navigates engagement.step backward; forward-skip ignored.
- `HardTargetPanel`: card renders damage + notes from constants matching SRD strings.

## Bug fixes summary (called out separately for the changelog)

1. **MoveModal grit reroll didn't deduct grit.** Now decrements on every click.
2. **MobilityCheckPhase re-roll was free with no grit gate.** Now costs 1 grit, disabled at 0.
3. **`nullifyTactic` accepted any trooper.** Now restricted to the squad sergeant, who must be non-BO, non-suppressed, grit ≥ 1.

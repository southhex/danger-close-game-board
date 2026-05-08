# Sector Granular Determination — Design Spec

**Date:** 2026-05-08
**Status:** Approved

---

## Problem

The Mission Blueprint Builder's sector cards use a binary "DETERMINE NOW" toggle: either all attributes are pre-set, or the whole sector is rolled on entry via `DetermineSectorPanel`. There is no way to pre-set some attributes while leaving others to roll on entry — e.g., a designer might want to fix the TL but let Cover and Space roll, or lock in that a sector is empty without rolling anything.

---

## Scope

Changes to the blueprint builder UI and `DetermineSectorPanel`. No new components. No server changes (sector data is stored as JSON blobs). No store mutations added.

**Out of scope:** Weather roll-on-entry (weather is always predetermined per-sector). Boon sub-type pre-determination in blueprints.

---

## Data Model

### New fields on `MissionSector` (`src/types.ts`)

```ts
rollCover?:    boolean
rollSpace?:    boolean
rollContents?: boolean
rollTL?:       boolean
contentsType?: 'engagement' | 'boon' | 'empty'
```

**Semantics:**

| Field | Meaning when `true` / set |
|---|---|
| `rollCover` | Cover is rolled on sector entry |
| `rollSpace` | Space is rolled on sector entry |
| `rollContents` | Contents type (engagement/boon/empty) is rolled on entry |
| `rollTL` | TL is rolled on entry — only relevant when `!rollContents && contentsType === 'engagement'` |
| `contentsType` | The predetermined contents type — set when `rollContents` is false |

**`contentsState` is now derived on blueprint save**, not set by a toggle:
- `rollCover || rollSpace || rollContents || (rollTL && contentsType === 'engagement')` → `'undetermined'`
- All flags false → `'predetermined'`

This keeps all runtime code (`setActiveSector`, `missionStateFromBlueprint`) unchanged — they still branch on `contentsState`.

### Migration of existing sectors in `fromMission()`

| Old `contentsState` | New flags |
|---|---|
| `'undetermined'` | All four flags = `true`; `contentsType` = `'engagement'` |
| `'predetermined'` | All four flags = `false`; `contentsType` = `'engagement'` |
| `'rolled'` (live/completed) | All flags = `false` (immutable — not shown in builder) |

### Defaults for new sectors in `emptySector()`

All flags `false`; `contentsType: 'engagement'`. A new sector is fully predetermined by default, which matches the existing builder behaviour.

---

## `SectorBlueprintCard` UI

### Remove

- "DETERMINE NOW" checkbox and its label.

### Add

A `?` button at the end of each value-button row. When active: amber border + amber text (matches existing `text-warn`/`border-warn` palette). Value buttons beside an active `?` render at reduced opacity — they're ignored at runtime but remain visible as the stored fallback.

```
COVER     [0]  [1]  [2]  [?]
SPACE     [0]  [1]  [2]  [?]
CONTENTS  [ENGAGEMENT]  [BOON]  [EMPTY]  [?]
TL        [1]  [2]  [3]  [4]   [?]        ← conditional (see below)
WEATHER   [select + ⬡]                     ← unchanged
```

### Visibility rules

**Cover and Space:** hidden only when `!rollContents && contentsType === 'empty'`. An empty sector has no engagement so these attributes are irrelevant. When `rollContents` is true they are shown (contents might resolve to engagement).

**TL row:** shown when `rollContents === true` OR `(!rollContents && contentsType === 'engagement')`. Hidden otherwise.

**Contents type picker:** shown always (replaces the old DETERMINE NOW toggle as the primary contents control). When `rollContents` is true the three type buttons render dimmed.

### Roll-all shortcut

A single `⬡ ROLL ALL` button in the card header row triggers `rollCover`, `rollSpace`, `rollWeather`, and — if TL is visible — `rollTL` in one shot, without touching the roll flags. This matches the existing per-field ⬡ behaviour. It does **not** set `rollContents` (contents type is a structural decision, not a quick roll).

---

## `DetermineSectorPanel` Adaptation

The panel reads roll flags from the active sector. Steps that are predetermined are skipped; their stored values are used directly when assembling the `applySectorRoll` call.

### Step decision table

| Condition | Behaviour |
|---|---|
| `rollCover` | Show Cover roll step |
| `!rollCover` | Skip; use `sector.cover` |
| `rollSpace` | Show Space roll step |
| `!rollSpace` | Skip; use `sector.space` |
| Weather | Always use `sector.weather` — no step |
| `rollContents` | Roll contents die → Nothing / Boon / TL as before |
| `!rollContents`, `contentsType === 'empty'` | Call `applySectorEmpty`, transition to `catch_breath` |
| `!rollContents`, `contentsType === 'boon'` | Roll boon die, pass to `BoonResolver` |
| `!rollContents`, `contentsType === 'engagement'`, `rollTL` | Show TL roll step only |
| `!rollContents`, `contentsType === 'engagement'`, `!rollTL` | Call `applySectorRoll` immediately with all stored values |

When `applySectorRoll` is called, the panel assembles `{ cover, space, tl, weather }` from whichever source applies to each field (rolled value or stored value).

If all flags are false, `contentsState` will be `'predetermined'` (derived on save) and the panel is never triggered — no change to `setActiveSector` needed.

### Backward compatibility

Sectors without roll flags (old data) have all flags as `undefined`, treated as `false`. They behave identically to today's predetermined sectors.

---

## Files Changed

| File | Change |
|---|---|
| `src/types.ts` | Add `rollCover?`, `rollSpace?`, `rollContents?`, `rollTL?`, `contentsType?` to `MissionSector` |
| `src/views/MissionBuilder/SectorBlueprintCard.tsx` | Remove DETERMINE NOW checkbox; add `?` buttons, contents type picker, visibility rules, ROLL ALL shortcut |
| `src/views/MissionBuilder/MissionBuilder.tsx` | Update `emptySector()` defaults; update `fromMission()` migration for old sectors |
| `src/views/MissionBoard/DetermineSectorPanel.tsx` | Make each step conditional on roll flags; assemble mixed stored/rolled values for `applySectorRoll` |

No store changes. No server changes. No new components.

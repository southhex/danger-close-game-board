# Handoff: Danger Close — V1 "Clean & Default" Design Language

## Overview

Danger Close is a digital play aid for a tabletop tactical-squad game. **V1 "Clean & Default"** is the modern-SaaS-style design direction: warm-neutral dark mode, comfortable density, a single emerald accent, and a sidebar-plus-content shell. It is intentionally *not* mil-sim — no stencil fonts, no camo textures, no all-caps panels. Think Linear / Vercel / modern productivity tool, applied to a squad-tactics play aid.

This handoff documents V1's design language as established in the `Danger Close App Shell.html` exploration. The goal is for a developer to recreate this aesthetic in a real codebase and apply it to the rest of the app's screens.

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes that show the intended look and feel, not production code to copy directly.

The task is to **recreate this design language in your target codebase** (React, Next.js, Remix, etc.) using its established patterns and component primitives. If the codebase has its own component library or token system, prefer that over re-creating these styles from scratch — the values below are the intent, not the implementation.

The HTML uses inline-styled React components purely so the prototype runs in a browser. Do not lift the inline styles wholesale; instead, translate the **tokens** into your codebase's theming system (CSS variables, Tailwind config, or theme object).

## Fidelity

**High-fidelity.** All colors, type sizes, weights, spacing, border radii, and component layouts are intentional and final for V1. Match them precisely.

## Design Language — Core Principles

1. **Warm-neutral dark, not cold dark.** Surfaces sit on a green-leaning warm gray (`oklch(0.175 0.006 130)`), not pure `#0f172a`-style cool slate.
2. **One accent, used sparingly.** Emerald is reserved for: active nav state, primary CTA, key metric callouts, the brand mark, and tab/segmented selection. Never decorative.
3. **Typography does the work.** Inter for UI, JetBrains Mono for numeric / stat values. Weights 400/500/600/700. No display fonts, no stencils.
4. **Comfortable density.** 14px base, 28px page padding, 12px gap grids, ample breathing room. This is not a dense ops console.
5. **Status color is semantic, not decorative.** The five status colors (ok/grazed/wounded/bleed/dead) map directly to game rules. Don't reuse them for general-purpose UI.
6. **Soft borders, modest radii.** Borders sit one step lighter than surfaces (low contrast). Radii are 6–14px depending on element size — never pill-shaped except for status badges.
7. **All-caps labels, restrained.** Tiny meta labels (`MOMENTUM`, `LOADOUT`, `SQUAD`) use 10–11px uppercase, weight 600, letter-spacing 0.3–0.4px, in `muted`. Don't all-caps body copy.

## Design Tokens

All colors are in `oklch()` so chroma stays even across hues. Translate to your theming system as-is or convert to hex if your toolchain doesn't support oklch (modern browsers all do).

### Surface & Ink

| Token | Value | Use |
|---|---|---|
| `bg` | `oklch(0.175 0.006 130)` | Page background, top-bar background |
| `surface` | `oklch(0.215 0.006 130)` | Sidebar, cards, primary panels |
| `surface2` | `oklch(0.255 0.006 130)` | Inset blocks (chips, sub-cards, search field) |
| `border` | `oklch(0.30 0.005 130)` | Default border (rare — most UI uses `borderSoft`) |
| `borderSoft` | `oklch(0.26 0.005 130)` | Card borders, divider lines |
| `ink` | `oklch(0.94 0.006 90)` | Primary text |
| `inkDim` | `oklch(0.78 0.006 90)` | Secondary text, sidebar nav (inactive) |
| `muted` | `oklch(0.62 0.006 100)` | Tertiary / meta labels |
| `subtle` | `oklch(0.48 0.006 100)` | Quietest text (counts, kbd shortcuts, breadcrumbs) |

### Accent (V1 only)

V1 uses **emerald** — `oklch(0.72 0.13 155)`. The other accents (amber/indigo/coral) are reserved for sibling variations and should not appear in V1.

The wider system shares lightness 0.72 / chroma 0.13 across all accents — only hue varies. This is the rule for any future accent.

### Status (semantic — keep mapping)

| Status | Token | Value |
|---|---|---|
| OK | `ok` | `oklch(0.76 0.13 155)` |
| Grazed | `grazed` | `oklch(0.82 0.13 90)` |
| Wounded | `wounded` | `oklch(0.72 0.15 45)` |
| Bleeding Out | `bleed` | `oklch(0.65 0.19 25)` |
| Dead | `dead` | `oklch(0.50 0.02 100)` (also: 0.4 opacity on the whole card) |

Ammo tracking pips reuse `grazed` (warm yellow) — that's intentional.

### Typography

| Family | Use | Weights |
|---|---|---|
| **Inter** | All UI text | 400, 500, 600, 700 |
| **JetBrains Mono** | Numeric stat values (momentum, squad count, MOB/FLK, dice totals) | 400, 500, 600, 700 |

Type scale:

| Size | Weight | Use |
|---|---|---|
| 26px / 700 / -0.6 ls | h1 — page title (e.g. "Op. Coldwater") |
| 22px / 700 | Mobile h1, large stat numbers |
| 18px / 600 | Card values (e.g. "Heavy", "Transitional") |
| 14px / 600 | Section heads ("Sector conditions", "Squad"), card titles |
| 13.5px / 500–600 | Sidebar nav labels, brand name |
| 13px / 400–600 | Body, breadcrumb |
| 12.5px / 600 | Buttons (top-bar) |
| 12px / 400–600 | Tabs, secondary buttons |
| 11.5px / 600 / 0.4 ls / UPPER | Eyebrow ("ACTIVE MISSION · ADVANCE 4") |
| 11px / 600 / 0.3 ls / UPPER | Card meta labels ("MOMENTUM", "LOADOUT") |
| 10.5px / 600 / 0.4 ls / UPPER | Stat-card labels |
| 10px / 700 / 0.4 ls | Status badges, sidebar LIVE badge (but use 9.5–10) |

### Spacing

| Token | Use |
|---|---|
| 28px | Page padding |
| 22px | Section bottom margin (hero → sector card) |
| 20px | Card padding (large cards) |
| 16px | Top-bar gap, top-bar height padding |
| 14px | Inset card padding (sector condition cells) |
| 12px | Grid gap (sector cells, squad cards) |
| 10px | Sidebar campaign-card padding |
| 9–10px | Sidebar nav row padding |

### Border Radius

| Value | Use |
|---|---|
| 4px | Status badges, kbd shortcut chip |
| 6px | Buttons, search field |
| 7px | Brand logo square |
| 8px | Sidebar nav buttons, mobile inline buttons |
| 10px | Stat tiles, sidebar campaign card, sector cells |
| 12px | Mobile cards |
| 14px | Main cards (sector card) |
| 999px | Status pill (right-aligned in trooper card header) |

### Density / Scale Variables

V1's host page exposes two CSS variables the prototype uses for global density tweaks. Treat as defaults; the production app doesn't need to expose them unless a density toggle is a feature.
- `--r` — radius multiplier (default 1)
- `--d` — density multiplier (default 1)

## Screens / Views

### Desktop App Shell (1280×820)

Two-pane layout: **220px sidebar** + **flex-1 main**.

#### Sidebar (220px wide)

- Background: `surface`, right border: `borderSoft`.
- Padding: `20px 14px`.
- **Top: brand block** — 28×28 emerald square with white `DC` monogram (700, 13px, -0.3 ls) + two-line label: "Danger Close" (600, 13.5px) over "Play aid" (11px, `muted`). Bottom padding 18px.
- **Nav items** — full-width buttons, 9px×10px padding, 8px radius, 2px margin-bottom. Layout: 17px icon + label (flex-1) + optional badge/count.
  - Inactive: `inkDim` text, transparent background.
  - Active: `color-mix(in oklch, emerald 14%, transparent)` background, emerald text, 600 weight.
  - "LIVE" badge on active "Mission" item: emerald background, `bg`-color text, 9.5px / 700 / 0.6 ls, `2px 6px` padding, 4px radius.
  - Counts (e.g. "6" on Barracks): 11px, `subtle`, no background.
- **Bottom: campaign card** (margin-top: auto) — 10px padding, 10px radius, `surface2` bg, `borderSoft` border. Three rows: small "Campaign" label (`muted`, 11px), bold campaign name (13px / 600), 5-segment progress strip (4px tall, 2px radius, emerald for completed, `border` for remaining), then "Sector 2 of 5" caption in `subtle`.

#### Top Bar (56px)

- Background: `bg` (matches page, not the sidebar — important).
- Bottom border: 1px `borderSoft`.
- Horizontal padding: 24px. Layout: breadcrumb · spacer · search field · roll-dice button · primary CTA.
- **Breadcrumb**: "Mission" in `muted` → 14px chevron in `subtle` (rotated -90°) → "Ridge 404" in 600.
- **Search field** (looks like a button, 6px radius, `surface` bg, `borderSoft` border): 13px search icon, "Search gear, perks…" placeholder in `muted`, then `⌘K` chip on the right (3px radius, `surface2`, `subtle`, 10.5px, `1px 5px`).
- **Roll dice button** (secondary): unset, 7×12px padding, 6px radius, `border` outline (note: `border`, not `borderSoft` — slightly stronger), `inkDim` text, 12.5px, dice icon + label.
- **Advance button** (primary): emerald background, `bg`-color text, 7×14px padding, 6px radius, 600, 12.5px.

#### Page Content

Padding: 28px. Sections separated by 20–22px.

##### Hero (eyebrow + title + stat tiles, flex justify-between)

- Eyebrow: 11.5px, 600, 0.4 ls, emerald — `ACTIVE MISSION · ADVANCE 4`. 6px below.
- h1: 26px / 700 / -0.6 ls — `Op. Coldwater`.
- Subtitle: 13px / `muted` / 4px top margin — `Ridge 404 · Threat Heavy · Bad weather`.
- Stat tiles (right side, flex gap 8): two `surface` cards with `borderSoft` border, 10×16 padding, 10px radius, centered text.
  - Tiny label (`MOMENTUM`/`SQUAD`): 10.5px / 600 / 0.4 ls / `muted`.
  - Value: 22px / 700, JetBrains Mono, 2px top margin. Momentum value is colored `wounded` when negative.
  - Caption: 10.5px / `muted`.

##### Sector card

- Container: `surface` bg, `borderSoft` border, 14px radius, 20px padding, 20px bottom margin.
- Header row (justify-between): "Sector conditions" (14 / 600) on left, modifier text (11.5 / `muted`) on right.
- Grid: 4 columns, 12px gap. Each cell:
  - 14px padding, 10px radius, `surface2` bg, `borderSoft` border.
  - Label (UPPER, 11 / 600 / 0.3 ls / `muted`).
  - Row: value (18 / 600) + numeric modifier (13 / `muted` / JetBrains Mono).

##### Squad section

- Header row: "Squad" (14 / 600) on left; on right, two unstyled toggle buttons "Grid" (`muted`) / "Cards" (emerald, 600). Active = colored.
- Grid: 4 columns, 12px gap.

#### V1TrooperCard

Container: `surface` bg, `borderSoft` border, 12px radius, `overflow: hidden`. Dead troopers render at 0.4 opacity.
- **Status stripe** at top: 3px tall, full bleed, status color.
- **Body**: 14px padding.
  - Header row (justify-between): name (14 / 600) over `callsign · tag` (11 / `muted`); right-side status pill — 10 / 700 / 0.4 ls, `3px 7px` padding, 999px radius, background = `color-mix(in oklch, statusColor 18%, transparent)`, text = statusColor.
  - **Pip rows** (flex gap 14): two `PipRow`s side-by-side — `GRIT` (emerald) and `AMMO` (`grazed` yellow). Each: 10 / 600 / 0.3 ls / `muted` label, 4px gap segments below. Pips are 6px tall, 3px radius (scaled), filled vs `border`.
  - **Off/Def chips** (2-col grid, 6px gap): each `Chip` is `surface2`, `borderSoft` border, 6px radius, 6×8 padding. Tiny label (9.5 / 600 / 0.3 ls / `muted`) over value (11.5 / 600).
  - **Loadout block**: `LOADOUT` mini-label, weapon (default ink-dim), then `special_weapon · special_gear` in `muted`. 11.5 / 1.55 line-height.
  - **Footer** (top border `borderSoft`, 10px top padding/margin, JetBrains Mono 11): left = `MOB n` (or `MOB n/max` if reduced; reduced uses `wounded` color), right = `FLK +n` in emerald.

### Mobile App Shell (390×820)

Single column, 4-zone layout: **header → momentum strip → tab label → scroll list → bottom nav**.

- **Header** (16px 18px 12px padding, `borderSoft` bottom border):
  - Top row (flex justify-between): emerald eyebrow `ACTIVE · ADV 4` (11 / 600 / 0.4 ls) on left; 36×36 emerald icon button (10px radius, `bg`-color icon) — primary dice action.
  - h1: 22 / 700 / -0.4 ls, 4px top margin.
  - Subtitle: 12.5 / `muted`, 2px top.
- **Momentum strip** (14px padding, flex gap 10):
  - Momentum card (flex 2, `surface`, 12px radius, 12px padding, `borderSoft`): label + −/+ buttons (28×28, 8px radius, `surface2`) flanking centered value (22 / 700, JetBrains Mono, `wounded` color when negative) and caption.
  - Squad card (flex 1, same treatment, centered text): `SQUAD` label + `4/4` value.
- **Tab label**: 4×18×8 padding, 13 / 600 — `Squad`.
- **Squad list** (flex-1, overflow auto, `0 14 8` padding, 10px gap): each row is a horizontal card.
  - `surface`, `borderSoft`, 12px radius, 12px padding, flex gap 12, items-center.
  - Left: 4px wide status-color stripe (full height, 2px radius).
  - Middle (flex-1, min-w-0): name (14 / 600) + callsign (11 / `muted`) on baseline; status line in status color (11 / 600); two pip rows side-by-side with 8px gap.
  - Right: 16px chevron (rotated -90°), `subtle` color.
- **Bottom nav** (`surface` bg, `borderSoft` top, `6 4 10` padding):
  - 4 tab cells, flex-1, vertical stack, 3px gap, 8px vertical padding.
  - Inactive: `muted`, 10.5 / 500. Active: emerald, 600.
  - 20px icon over 10.5px label.

## Components — Implementation Inventory

These are the pieces a developer will likely build as reusable components in the target codebase:

1. **`Sidebar`** — branded, with nav items (icon/label/badge/count) and a footer "campaign card."
2. **`NavItem`** — accent-tinted active state via `color-mix`.
3. **`TopBar`** — breadcrumb, search-as-button, secondary + primary CTA. Mobile-replaced by header.
4. **`StatTile`** — mini metric card (label / mono value / caption). Variant: numeric value can be colored by status.
5. **`SectionCard`** — title + meta header, grid of inset cells.
6. **`Card`** (generic) — `surface` + `borderSoft` + 12–14 radius + 20 padding.
7. **`PipRow`** — labeled segmented bar; takes value/max/color.
8. **`Chip`** — small label-over-value chip, `surface2` background.
9. **`StatusBadge`** — status-tinted pill: bg = 18% mix, text = full color.
10. **`StatusStripe`** — 3px top stripe (desktop) / 4px left stripe (mobile).
11. **`TrooperCard`** — desktop variant (vertical) and mobile variant (horizontal); same data, different layout.
12. **`Icon`** — line SVG set, 1.75 stroke, 24-viewbox. The set is intentionally small: `barracks, mission, dice, settings, plus, minus, chevron, arrowL, arrowR, search, shield, crosshair, heart, flag, menu, close, more, info, check, x, eye, cloud, target`. Replace with your codebase's icon library if present (Lucide is the closest match — it follows the same line-only / 1.75-stroke / round-cap conventions).
13. **`BottomNav`** — mobile, accent-active.
14. **`MomentumControl`** — mobile, value with −/+ steppers; value color reflects sign.

## Interactions & Behavior

V1 is primarily a *static layout* exploration — interactions are conventional and not the focus. For each interactive element:

- **Buttons**: hover should slightly raise contrast (e.g. `surface` → `surface2` for secondary, accent mix shifts darker for primary). Active/pressed: scale 0.98 or shift bg one more step. Focus ring: 2px outline in accent at 0.5 opacity.
- **Nav items**: hover (inactive) → background `surface2`. Active state already styled.
- **Cards**: no hover effect by default. If clickable, raise to `surface2` background; do not add elevation.
- **Stat tiles**: not interactive in V1.
- **Search "field"**: clicking opens a command-palette modal (out of scope here — design later, but the trigger is `⌘K`).
- **Roll dice / Advance**: trigger a dice modal (mobile uses the floating emerald button as the primary roll trigger). Out of scope for V1's layout doc.
- **Tab buttons (Grid / Cards)**: instantly swap squad layout. No transition.

Animations: keep motion *minimal*. 150–200ms ease-out on hover/active state changes. No spring animations, no layout shifts on hover.

## State Management

V1 is a layout pass — no behavioral state to document beyond what your routing/data layer already does. The mock data shape (`mockMission`, `mockSquad`, `mockRolls`) is in `mock-data.md` for reference only; the real types live in your codebase's `src/types.ts`.

## Responsive Behavior

V1 ships two layouts — **desktop** (≥1024px) and **mobile** (<768px). Tablet (768–1023px) should fall back to the mobile layout in a wider container, or the developer can introduce a third breakpoint if there's product appetite. The exploration didn't define one.

The desktop sidebar collapses to nothing on mobile (the bottom nav replaces it). The top bar collapses to the mobile header.

## Assets

- **Fonts**: Inter and JetBrains Mono via Google Fonts. Weights 400/500/600/700 for both. Inter is the primary; JetBrains Mono is *only* for numeric values.
- **Icons**: inline SVGs (see `Icon` component, 23 glyphs). Recommend swapping to **Lucide** in production — it matches the line-only / 1.75-stroke / round-cap conventions and covers all 23 names.
- **Imagery**: V1 uses no photography or illustration. The brand mark is a typographic monogram (`DC`).

## Files in This Bundle

- `README.md` (this file) — design language spec.
- `Danger Close App Shell.html` — full HTML prototype with V1 desktop and mobile, alongside V2/V3/V4 for context. Open in any modern browser. V1 is the emerald variant.
- `V1_Clean.jsx` — V1's React source extracted from the prototype. Use as a structural reference, not a code-import target.
- `tokens.css` — CSS custom properties for all V1 tokens, ready to drop into a stylesheet.
- `tokens.ts` — same tokens as a TS object, for theme-as-object setups.
- `mock-data.md` — the mock mission, squad, and roll data used in the prototype, for parity when wiring up components.

## Implementation Notes for Claude Code

- **Start with tokens.** Drop `tokens.css` (or `tokens.ts`) into the codebase first; build components against the variables, not literal values.
- **Don't lift inline styles.** The HTML uses inline styles only because the prototype is a single file. Translate to your styling layer (CSS modules, Tailwind via the matching token map, styled-components, vanilla-extract — whatever the codebase uses).
- **Tailwind users**: `tokens.css` defines CSS variables; map them in `tailwind.config.js` under `theme.extend.colors` as `var(--token-name)` references. Add a `font-mono` override pointing to JetBrains Mono.
- **`color-mix(in oklch, ...)`** is used for active-state backgrounds (14% accent on transparent) and status badges (18% status on transparent). All current browsers support it. Fall back to a hand-rolled rgba/oklch with alpha if you must support older targets.
- **Status color is data, not style.** Wire `statusColor()` and `statusLabel()` as utility functions on the trooper-status enum; don't hard-code per-component.
- **Density variables (`--r`, `--d`)** are optional. Skip unless the product wants a density toggle.
- **Keep the icon stroke consistent at 1.75.** If you swap to Lucide, set its global stroke-width to 1.75 to match.

# Danger Close — V1 Design Language (Level 3 Shell Polish)

## Context

The app's current visual style is functional but rough: Share Tech Mono everywhere, 0px border radius, a 56px icon-only sidebar, and bare hex colors. The designer produced a full V1 handoff (`design_handoff_v1_clean/`) proposing a modern-SaaS aesthetic with Inter/JetBrains Mono typography, oklch warm-neutral tokens, and a significantly richer layout.

The full V1 layout (220px sidebar, breadcrumb topbar, search field, campaign progress card, hero section) is too much structural change for now. This spec captures the **"Level 3 Shell Polish"** middle ground: adopt the full design language and polish every component surface, but keep all page content layouts (mission board phases, engagement wizard, advance roll, sector chain) exactly as-is.

The dice tray additionally receives SVG die shapes and a spin animation ported from the existing `EXAMPLE - dicebag/` reference.

---

## Design Tokens

Replace the current `tailwind.config.js` palette and `src/index.css` with the V1 token system. All colors in oklch.

**Tailwind color extensions:**

| Tailwind key | Value | Use |
|---|---|---|
| `bg` | `oklch(0.175 0.006 130)` | Page background |
| `surface` | `oklch(0.215 0.006 130)` | Sidebar, cards, primary panels |
| `surface2` | `oklch(0.255 0.006 130)` | Inset blocks, inputs, die faces |
| `border` | `oklch(0.30 0.005 130)` | Stronger borders (button outlines) |
| `border-soft` | `oklch(0.26 0.005 130)` | Card/divider borders |
| `ink` | `oklch(0.94 0.006 90)` | Primary text |
| `ink-dim` | `oklch(0.78 0.006 90)` | Secondary text, inactive nav |
| `muted` | `oklch(0.62 0.006 100)` | Tertiary / meta labels |
| `subtle` | `oklch(0.48 0.006 100)` | Quietest text (counts, hints) |
| `accent` | `oklch(0.72 0.13 155)` | Emerald — active nav, primary CTA, high die |
| `ok` | `oklch(0.76 0.13 155)` | OK status |
| `grazed` | `oklch(0.82 0.13 90)` | Grazed / ammo pips |
| `wounded` | `oklch(0.72 0.15 45)` | Wounded |
| `bad` | `oklch(0.65 0.19 25)` | Bleeding out (replaces current `bad`) |
| `dead` | `oklch(0.50 0.02 100)` | Dead |

Remove current `neutral`, `wound`, `dockfade` keys (replaced by above).

**Keep `warn`** — it is used as the "active/selected state" color throughout all mission board engagement wizard components (50+ usages across IntentStep, OffenseStep, DefenseStep, GearActionModal, EnemyTacticsStep, SectorEditorModal, etc.). Do not rename or remove it. Update its value to the V1 amber token: `oklch(0.82 0.13 90)` (same perceptual amber as `grazed`, different semantic role — `warn` is UI action state, `grazed` is trooper health state).

**Tailwind font extension:**

```js
fontFamily: {
  sans: ['"Inter"', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
}
```

**Google Fonts import** (replace Share Tech Mono in `src/index.css`):
```
Inter:wght@400;500;600;700
JetBrains Mono:wght@400;500;600;700
```

**Base styles** — default body font becomes `font-sans` (Inter). The `font-mono` class is used explicitly on numeric/stat values and the `.lbl` utility. Update `.lbl` to use Inter at 10px/600/0.3px letter-spacing.

**`color-mix` utilities** — used for active nav background and status badge backgrounds. Add to `src/index.css` as CSS custom properties or use inline styles in the two components that need them (App sidebar nav item, StatusBadge).

---

## Typography Rules

- **All UI text** (labels, nav, buttons, body): `font-sans` (Inter)
- **Numeric/stat values** (momentum, mob, flk, dice totals, pip counts): `font-mono` (JetBrains Mono)
- **`.lbl` utility** stays uppercase + letter-spacing, switches to Inter 600

---

## Border Radius

Add to Tailwind config:

| Key | Value | Use |
|---|---|---|
| `xs` | `4px` | Status badges, kbd chips |
| `sm` | `6px` | Buttons, inputs, small chips |
| `md` | `8px` | Nav items, mobile buttons |
| `lg` | `10px` | Stat tiles, sector cells |
| `xl` | `12px` | Cards, mission dock cards |
| `2xl` | `14px` | Large cards |
| `pill` | `999px` | Status pills |

---

## App Shell (`src/App.tsx`)

### Desktop Sidebar

Change from 56px icon strip → **160px** labeled sidebar.

- Background: `bg-surface`, right border: `border border-soft`
- Padding: `p-4` (16px)
- **Brand block** (top): 26×26px emerald square (`bg-accent text-bg rounded-md font-bold text-[11px]`) + label stack ("Danger Close" 13px/600 + "Play aid" 10.5px `text-muted`). Bottom padding/margin before nav.
- **Nav items**: full-width `button`, `flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-0.5`. Inactive: `text-ink-dim font-medium`. Active: `bg-[color-mix(in_oklch,theme(colors.accent)_14%,transparent)] text-accent font-semibold`. Icon (16px) + label (flex-1) + optional count/badge.
- **Trooper count badge** on Barracks: `text-[11px] text-subtle font-mono`
- **LIVE badge** on active Mission: `text-[9px] font-bold tracking-wide bg-accent text-bg px-1.5 py-0.5 rounded-xs`
- Add Dice Tray as a proper nav item (icon: `⬡`, label: "Dice Tray"). On desktop, clicking it toggles the existing right-side DiceTray panel (same behavior as the current header button — no structural change to DiceTray). On mobile, it becomes the 4th bottom tab and opens the existing bottom sheet. The current header dice button is removed.

### Page Header

Change from bare uppercase label → title + subtitle + dice button.

- Background: `bg-bg`, bottom border: `border-b border-border-soft`
- Left: page title (`text-[15px] font-bold`) + subtitle (`text-[11px] text-muted`) — subtitle shows mission name + active sector when on Mission view, trooper count on Barracks.
- Right: "Roll Dice" button (`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border text-[12px] font-medium text-ink-dim`). Clicking still opens the DiceTray modal/panel as it does today.
- Remove the current amber `⬡` icon button.

### Mobile Bottom Nav

Change from 3-tab → **4-tab** (add Dice Tray as its own tab).

- Inactive: `text-muted font-medium text-[10.5px]`
- Active: `text-accent font-semibold`
- Full text labels (not 2-char abbreviations): "Barracks", "Mission", "Dice", "Settings"

---

## Trooper Card — Barracks (`src/views/Barracks/TrooperCard.tsx`)

### Structure

```
┌──────────────────────────────────┐
│ ░ 3px status color stripe         │
├──────────────────────────────────┤
│ Name (600)          [STATUS PILL] │
│ Callsign · Tag (muted, 11px)      │
│                                   │
│ GRIT ▪▪▪  AMMO ▪▪○               │
│                                   │
│ LOADOUT                           │
│ Armor · Weapon (ink-dim)          │
│ SW: ... · SG: ... (muted)        │
│                                   │
│ Perk tags (border chips)          │
├──────────────────────────────────┤
│ MOB 4 (mono)        FLK +2 (accent) │
└──────────────────────────────────┘
```

- Container: `bg-surface border border-border-soft rounded-xl overflow-hidden`. Dead: `opacity-45`.
- **Status stripe**: `h-[3px] w-full` colored by `STATUS_COLOR[trooper.status]`.
- **Body**: `p-3.5 flex flex-col gap-2`.
- **Header row**: name (`text-[14px] font-semibold`) + status pill (`text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-pill`, bg = `color-mix(statusColor 18%, transparent)`, text = statusColor).
- **Pip rows** (inline, `flex gap-3`): `PipTracker` already exists — keep using it; update its visual style (segment bars, not pip dots) if not already done; see PipTracker section.
- **Loadout**: `LOADOUT` label (`.lbl text-[9.5px]`), weapon line (`text-[12px] text-ink-dim`), gear line (`text-[11px] text-muted`).
- **Perk tags**: `flex flex-wrap gap-1`, each tag `text-[9px] font-semibold uppercase tracking-wide border border-border-soft px-1.5 py-0.5 rounded-xs text-muted`.
- **Footer**: `flex justify-between border-t border-border-soft px-3.5 py-2 font-mono text-[11px]`. MOB value: `text-ink-dim`. FLK value: `text-accent`.

---

## TrooperMissionCard (`src/views/MissionBoard/TrooperMissionCard.tsx`)

Same treatment as the barracks card, adapted for the narrower 180px horizontal layout.

- Container: `bg-bg border border-border-soft rounded-xl overflow-hidden`. Keep `w-[180px] flex-shrink-0 snap-start`. Expanded: `border-accent`.
- **Status stripe**: `h-[3px] w-full` (same as barracks card, replaces the current `borderTop` inline style).
- **Body**: `p-2.5 flex flex-col gap-1.5`.
- **Header**: name (`text-[13px] font-semibold`) + callsign (`text-[10px] text-muted`). Suppression dot stays. Expand button stays.
- **Status/Off/Def dropdowns**: existing `Dropdown` component — update its visual to `bg-surface2 border border-border-soft rounded-sm`. Status value colored by status. Flanking value: `text-accent`.
- **Pip rows**: same `PipTracker` as barracks card.

---

## PipTracker (`src/components/PipTracker.tsx`)

Update visual from single-char dots → **segmented bars**.

Each pip: `w-[18px] h-[6px] rounded-[3px]`. Filled: color passed via prop (ok-color for grit, grazed-color for ammo). Empty: `bg-border`.

Label stays `.lbl text-[9.5px]`.

---

## StatusBadge (`src/components/StatusBadge.tsx`)

Update to pill shape with color-mix tinted background:
- `rounded-pill px-[7px] py-[3px] text-[10px] font-bold tracking-[0.3px]`
- `background: color-mix(in oklch, statusColor 18%, transparent)`
- `color: statusColor`

---

## Dice Tray (`src/views/DiceTray/`)

### DiceTray panel

Update panel chrome to match token system:
- Background `bg-surface`, border `border-border-soft`, radius `rounded-xl` (desktop right panel) / `rounded-t-xl` (mobile sheet)
- Panel header: `DICE TRAY` label (`.lbl`) + close button (`bg-surface2 border border-border-soft rounded-sm`)

### DiceControls (`src/views/DiceTray/DiceControls.tsx`)

Major visual upgrade.

**Die type selector**: Replace flat text chip buttons with SVG die shape buttons.
- Each button: 34×34px shell with an absolutely-positioned SVG layer (`.db-path` gets fill/stroke via CSS) + content overlay for the label.
- Inactive: fill `bg-surface2`, stroke `border-soft`.
- Active: fill `color-mix(accent 16%, surface2)`, stroke `accent`.
- Hover: subtle accent fill tint.

**SVG shapes** (port from `EXAMPLE - dicebag/main.js`):
- d3/d6: rounded square
- d4: triangle (label nudged down 4px to optical centroid)
- d8/d10: diamond
- d12: pentagon (label nudged down 2px)
- d20: hexagon
- d100/dx: ellipse (label smaller: 6.5px)

**Count + modifier controls**: Replace bare `+/-` text buttons with `28×28px rounded-sm bg-surface2 border border-border-soft` stepper buttons. Value displayed in `font-mono text-[16px] font-bold`.

**Roll button**: Full-width `bg-accent text-bg rounded-md font-semibold text-[13px] py-2.5`. (Replaces amber-bordered button.)

**Result display**: Replace flat number boxes with SVG die faces.
- Each result die: 52×52px shell, same SVG shape as the selected die type.
- High die (or lowest in 0d mode): fill tinted with accent, stroke accent.
- Dim die (non-result in 0d mode): `opacity-30`.
- d3/d6: render pips from `PIP_LAYOUTS`; all others: numeric label.
- d4 number: nudge down 8px. d12 number: nudge down 3px.

**Spin animation**: on each new roll, add `.spinning` class to each result shell, staggered by 45ms per die.

```css
@keyframes dc-spin {
  0%   { transform: rotate(0deg)   scale(0.65); }
  55%  { transform: rotate(330deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
}
.spinning {
  animation: dc-spin 0.45s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
}
```

Cancel pending spin timers on rapid re-roll.

**Stats chips**: Below results, a flex row of `stat-chip` tiles (bg-surface2, border-soft, rounded-sm) showing Highest/Total and Sixes when rolling d6.

### MobilityCheckRoll (`src/views/DiceTray/MobilityCheckRoll.tsx`)

- Each trooper row: `bg-bg border border-border-soft rounded-lg px-2.5 py-2 flex justify-between`.
- Name `text-[12px] font-semibold`, MOB label `font-mono text-[10px] text-muted`.
- Roll button: `border border-border text-[11px] font-semibold text-ink-dim px-2.5 py-1 rounded-sm`. On hover: `border-accent text-accent`.
- Pass: `text-ok font-bold`. Fail: `text-bad font-bold`.

### RollHistory (`src/views/DiceTray/RollHistory.tsx`)

- Each history row: `bg-bg border border-border-soft rounded-sm px-2.5 py-1.5 flex justify-between`.
- Label: `text-muted text-[11px]`. Result: `font-mono text-[11px]`. Total value: `text-accent font-bold`.

---

## What Is NOT Changing

- All page content layouts: MissionBoard phases, EngagementPanel, CatchBreathPanel, AdvanceRollPanel, SectorChainStrip, SectorMomentumPanel, MissionNotes.
- All game logic (`src/utils/gameRules.ts`).
- All store logic (`src/store/index.ts`).
- Dropdown component (visual update may be trivial — same surface2/border-soft treatment — but no structural changes).
- Modal, ConfirmDialog, GearPopover, Toast components (token-only pass is fine).

---

## Verification

1. `npm run dev` — confirm app loads, no console errors.
2. Check both desktop (≥768px) and mobile (<768px) breakpoints.
3. Barracks: cards show status stripe, pips, footer with mono MOB/FLK.
4. Mission board: dock cards show status stripe, colored status value.
5. Dice tray: Roll button fires spin animation; high die highlighted; pips on d6; stats chips appear.
6. Mobility check: pass = green, fail = red.
7. `npm run test` — all 91 tests pass (no logic touched).

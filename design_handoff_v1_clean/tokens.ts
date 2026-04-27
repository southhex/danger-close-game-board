// Danger Close — V1 "Clean & Default" design tokens.
// Mirror of tokens.css for codebases that use a JS theme object
// (styled-components ThemeProvider, vanilla-extract, etc.).

export const tokens = {
  color: {
    bg:          'oklch(0.175 0.006 130)',
    surface:     'oklch(0.215 0.006 130)',
    surface2:    'oklch(0.255 0.006 130)',
    border:      'oklch(0.30  0.005 130)',
    borderSoft:  'oklch(0.26  0.005 130)',
    ink:         'oklch(0.94  0.006 90)',
    inkDim:      'oklch(0.78  0.006 90)',
    muted:       'oklch(0.62  0.006 100)',
    subtle:      'oklch(0.48  0.006 100)',

    // V1 accent
    accent:      'oklch(0.72 0.13 155)',  // emerald
    accentSoft:  'color-mix(in oklch, oklch(0.72 0.13 155) 14%, transparent)',

    // Status (semantic — keep mapping)
    statusOk:      'oklch(0.76 0.13 155)',
    statusGrazed:  'oklch(0.82 0.13 90)',
    statusWounded: 'oklch(0.72 0.15 45)',
    statusBleed:   'oklch(0.65 0.19 25)',
    statusDead:    'oklch(0.50 0.02 100)',
  },

  // Sibling-variation accents (NOT used in V1 — kept for the wider system)
  accents: {
    emerald: 'oklch(0.72 0.13 155)',
    amber:   'oklch(0.78 0.13 75)',
    indigo:  'oklch(0.72 0.13 265)',
    coral:   'oklch(0.72 0.13 30)',
  },

  font: {
    ui:   '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },

  radius: {
    xs:   '4px',
    sm:   '6px',
    md:   '8px',
    lg:   '10px',
    xl:   '12px',
    '2xl':'14px',
    pill: '999px',
  },

  space: {
    1: 4, 2: 8, 3: 10, 4: 12, 5: 14, 6: 16, 7: 20, 8: 22, 9: 24, 10: 28,
  },
} as const;

export type StatusKey = 'ok' | 'grazed' | 'wounded' | 'bleedingout' | 'dead';

export function statusColor(s: StatusKey): string {
  return ({
    ok:           tokens.color.statusOk,
    grazed:       tokens.color.statusGrazed,
    wounded:      tokens.color.statusWounded,
    bleedingout:  tokens.color.statusBleed,
    dead:         tokens.color.statusDead,
  })[s] ?? tokens.color.muted;
}

export function statusLabel(s: StatusKey): string {
  return ({
    ok: 'OK', grazed: 'Grazed', wounded: 'Wounded',
    bleedingout: 'Bleeding Out', dead: 'Dead',
  })[s] ?? s;
}

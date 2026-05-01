// Token strings for inline-style contexts where Tailwind classes can't be used
// (dynamic colors, SVG fills, gradients in inline style, etc.)
// Values match tailwind.config.js — keep in sync.

export const TOKEN = {
  bg:       'oklch(0.175 0.006 130)',
  surface:  'oklch(0.215 0.006 130)',
  surface2: 'oklch(0.255 0.006 130)',
  border:   'oklch(0.26  0.005 130)',
  ink:      'oklch(0.94  0.006 90)',
  inkDim:   'oklch(0.78  0.006 90)',
  muted:    'oklch(0.62  0.006 100)',
  ok:       'oklch(0.76  0.13  155)',
  warn:     'oklch(0.82  0.13  90)',
  wounded:  'oklch(0.72  0.15  45)',
  bad:      'oklch(0.65  0.19  25)',
  dead:     'oklch(0.50  0.02  100)',
  dockfade: 'oklch(0.13  0.005 130)',
} as const

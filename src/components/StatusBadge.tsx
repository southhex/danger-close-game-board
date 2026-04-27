import type { TrooperStatus } from '../types'

const COLOR: Record<TrooperStatus, string> = {
  ok:         'oklch(0.76 0.13 155)',
  grazed:     'oklch(0.82 0.13 90)',
  wounded:    'oklch(0.72 0.15 45)',
  bleedingout:'oklch(0.65 0.19 25)',
  dead:       'oklch(0.50 0.02 100)',
}

const LABEL: Record<TrooperStatus, string> = {
  ok: 'OK', grazed: 'GRAZED', wounded: 'WOUNDED', bleedingout: 'BLEEDING', dead: 'DEAD',
}

export default function StatusBadge({ status }: { status: TrooperStatus }) {
  const color = COLOR[status]
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
      padding: '3px 7px', borderRadius: 999,
      background: `color-mix(in oklch, ${color} 18%, transparent)`,
      color,
    }}>
      {LABEL[status]}
    </span>
  )
}

export const STATUS_COLOR = COLOR
export const STATUS_LABEL = LABEL

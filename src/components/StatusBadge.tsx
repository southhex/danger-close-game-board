import type { TrooperStatus } from '../types'

import { TOKEN } from '../utils/tokens'

const COLOR: Record<TrooperStatus, string> = {
  ok:         TOKEN.ok,
  grazed:     TOKEN.warn,
  wounded:    TOKEN.wounded,
  bleedingout:TOKEN.bad,
  dead:       TOKEN.dead,
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

import type { TrooperStatus } from '../types'

const COLOR: Record<TrooperStatus, string> = {
  ok: '#5a9e6e',
  grazed: '#c8a030',
  wounded: '#d45f27',
  bleedingout: '#c93535',
  dead: '#687868',
}

const LABEL: Record<TrooperStatus, string> = {
  ok: 'OK', grazed: 'GRAZED', wounded: 'WOUNDED', bleedingout: 'BLEEDING', dead: 'DEAD',
}

export default function StatusBadge({ status }: { status: TrooperStatus }) {
  return (
    <span className="text-[10px] tracking-wider" style={{ color: COLOR[status] }}>
      {LABEL[status]}
    </span>
  )
}

export const STATUS_COLOR = COLOR
export const STATUS_LABEL = LABEL

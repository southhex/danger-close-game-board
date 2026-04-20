import type { Trooper } from '../../types'

interface Props {
  trooper: Trooper
  onClick: () => void
}

export default function TrooperCard({ trooper, onClick }: Props) {
  return (
    <button onClick={onClick}
      className={`text-left bg-surface border border-border p-3 flex flex-col gap-1 ${trooper.active ? '' : 'opacity-50'}`}>
      <div className="flex items-baseline justify-between">
        <div className="text-ok text-xs tracking-wider">{trooper.name.toUpperCase()}</div>
        <div className="text-[10px] text-muted">{trooper.callsign}</div>
      </div>
      <div className="text-[10px] text-muted">{trooper.fullname}</div>
      <div className="text-[10px] text-ink mt-2">{trooper.armor || '—'}</div>
      <div className="text-[10px] text-ink">{trooper.weapon || '—'}</div>
      {trooper.special_weapon && <div className="text-[10px] text-muted">SW: {trooper.special_weapon}</div>}
      {trooper.special_gear && <div className="text-[10px] text-muted">SG: {trooper.special_gear}</div>}
      <div className="flex justify-between mt-2 text-[10px] text-muted">
        <span>MOB {trooper.mobility}</span>
        <span>PERK {trooper.perkpoints}</span>
        {!trooper.active && <span className="text-bad">INACTIVE</span>}
      </div>
    </button>
  )
}

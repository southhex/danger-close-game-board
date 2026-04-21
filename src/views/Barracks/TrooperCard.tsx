import { TextPopover } from '../../components'
import { tagByName } from '../../data/tags'
import type { Trooper } from '../../types'

interface Props {
  trooper: Trooper
  onClick: () => void
}

export default function TrooperCard({ trooper, onClick }: Props) {
  const tagData = trooper.tag ? tagByName(trooper.tag) : undefined

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
      {(tagData || trooper.perks.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-1">
          {tagData && (
            <TextPopover title={tagData.name} body={tagData.description}>
              <span className="text-[9px] border border-border px-1 text-muted uppercase tracking-wider">
                {tagData.name}
              </span>
            </TextPopover>
          )}
          {trooper.perks.map((perk, i) => (
            <TextPopover key={i} title={perk.name} body={perk.description || 'No description.'}>
              <span className="text-[9px] border border-border px-1 text-muted uppercase tracking-wider">
                {perk.name}
              </span>
            </TextPopover>
          ))}
        </div>
      )}
    </button>
  )
}

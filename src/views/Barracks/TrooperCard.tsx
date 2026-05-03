import { TextPopover } from '../../components'
import { STATUS_COLOR, STATUS_LABEL } from '../../components/StatusBadge'
import { tagByName } from '../../data/tags'
import { flankingBonus } from '../../utils/gameRules'
import type { Trooper } from '../../types'

interface Props { trooper: Trooper; onClick: () => void }

export default function TrooperCard({ trooper, onClick }: Props) {
  const tagData = trooper.tag ? tagByName(trooper.tag) : undefined
  const statusColor = STATUS_COLOR[trooper.status]
  const flk = flankingBonus(trooper.mobility)

  return (
    <button onClick={onClick}
      className={`text-left bg-surface border border-border rounded-xl overflow-hidden flex flex-col w-full
        ${trooper.squadId ? '' : 'opacity-45'}`}>
      {/* Status stripe */}
      <div style={{ height: 3, background: statusColor, width: '100%' }} />

      {trooper.recovering && (
        <div className="text-[9px] font-bold tracking-wide bg-warn/20 text-warn px-2 py-0.5 text-center uppercase">
          Recovering
        </div>
      )}

      {/* Body */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[14px] font-semibold leading-tight">{trooper.name}</div>
            <div className="text-[11px] text-muted mt-0.5">
              {trooper.callsign}{trooper.tag ? ` · ${trooper.tag}` : ''}
            </div>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.3px', flexShrink: 0,
            padding: '3px 7px', borderRadius: 999,
            background: `color-mix(in oklch, ${statusColor} 18%, transparent)`,
            color: statusColor,
          }}>
            {STATUS_LABEL[trooper.status]}
          </span>
        </div>

        {/* Loadout */}
        <div className="flex flex-col gap-0.5">
          <div className="lbl text-[9.5px]">Loadout</div>
          <div className="text-[12px] text-ink-dim leading-snug">
            {[trooper.armor, trooper.weapon].filter(Boolean).join(' · ') || '—'}
          </div>
          {(trooper.special_weapon || trooper.special_gear) && (
            <div className="text-[11px] text-muted">
              {[trooper.special_weapon && `SW: ${trooper.special_weapon}`,
                trooper.special_gear  && `SG: ${trooper.special_gear}`]
                .filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {/* Perks / tags */}
        {(tagData || trooper.perks.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {tagData && (
              <TextPopover title={tagData.name} body={tagData.description}>
                <span className="text-[9px] font-semibold uppercase tracking-wide border border-border px-1.5 py-0.5 rounded-xs text-muted">
                  {tagData.name}
                </span>
              </TextPopover>
            )}
            {trooper.perks.map((perk, i) => (
              <TextPopover key={i} title={perk.name} body={perk.description || 'No description.'}>
                <span className="text-[9px] font-semibold uppercase tracking-wide border border-border px-1.5 py-0.5 rounded-xs text-muted">
                  {perk.name}
                </span>
              </TextPopover>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between border-t border-border px-3.5 py-2 font-mono text-[11px]">
        <span className="text-ink-dim">MOB {trooper.mobility}</span>
        <span className="text-accent">FLK +{flk}</span>
      </div>
    </button>
  )
}

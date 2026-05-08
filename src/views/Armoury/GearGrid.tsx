import type { GearItem } from '../../types'

const SLOT_LABEL: Record<GearItem['geartype'], string> = {
  armor:            'Armor',
  weapon:           'Weapon',
  specialweapon:    'Special Weapon',
  specialequipment: 'Special Equipment',
}

interface Props {
  items:           GearItem[]
  geartype:        GearItem['geartype']
  selectedTrooper: string | null
  reqEnabled:      boolean
  reqPool:         number
  onBuy:           (item: GearItem) => void
}

export default function GearGrid({ items, geartype, selectedTrooper, reqEnabled, reqPool, onBuy }: Props) {
  const group = items.filter(g => g.geartype === geartype)
  if (!group.length) return null

  return (
    <section>
      <div className="lbl text-[10px] mb-2">{SLOT_LABEL[geartype]}</div>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
        {group.map(item => {
          const hasCost  = item.reqcost > 0
          const canAfford = !reqEnabled || reqPool >= item.reqcost
          const btnEnabled = !!selectedTrooper && (!reqEnabled || canAfford)

          return (
            <div key={item.name}
              className="bg-bg border border-border rounded-md p-3 flex flex-col gap-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[12px] text-ink font-mono">{item.name}</div>
                  <div className="text-[10px] text-muted">{item.description}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {reqEnabled && (
                    <span className={`text-[10px] font-mono font-bold ${hasCost ? 'text-warn' : 'text-muted'}`}>
                      {hasCost ? `${item.reqcost} REQ` : 'FREE'}
                    </span>
                  )}
                  {item.mobility_cost < 0 && (
                    <span className="text-[9px] text-muted font-mono">MOB {item.mobility_cost}</span>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-secondary leading-relaxed">{item.properties}</div>

              {item.max_uses > 0 && (
                <div className="text-[9px] text-muted">Uses: {item.max_uses}</div>
              )}

              <button
                type="button"
                onClick={() => onBuy(item)}
                disabled={!btnEnabled}
                className={`mt-1 self-start px-2.5 py-0.5 text-[10px] border font-mono ${
                  btnEnabled
                    ? 'border-accent text-accent hover:bg-accent/10 cursor-pointer'
                    : 'border-border text-muted cursor-not-allowed opacity-50'
                }`}
              >
                {!selectedTrooper
                  ? 'SELECT TROOPER'
                  : reqEnabled && !canAfford
                    ? 'INSUFFICIENT REQ'
                    : reqEnabled && hasCost
                      ? `BUY (${item.reqcost} REQ)`
                      : 'ASSIGN'}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

import { useRef, useState } from 'react'
import { useStore } from '../../store'
import { GEAR } from '../../data/gear'
import type { GearItem, CampaignGearItem } from '../../types'
import GearDetailModal from './GearDetailModal'

const SECTION_ORDER: GearItem['geartype'][] = ['armor', 'weapon', 'specialweapon', 'specialequipment']
const SECTION_LABEL: Record<GearItem['geartype'], string> = {
  armor:            'Armor',
  weapon:           'Weapon',
  specialweapon:    'Special Weapon',
  specialequipment: 'Special Equipment',
}

function effectiveReq(item: GearItem, cg: CampaignGearItem | undefined): number {
  return cg?.customReq !== null && cg?.customReq !== undefined ? cg.customReq : item.reqcost
}

function effectiveName(item: GearItem, cg: CampaignGearItem | undefined): string {
  return cg?.customName ?? item.name
}

function assignedCount(gearName: string, troopers: ReturnType<typeof useStore.getState>['troopers']): number {
  return troopers.filter(t =>
    t.armor === gearName || t.weapon === gearName ||
    t.special_weapon === gearName || t.special_gear === gearName
  ).length
}

export default function Armoury() {
  const campaigns         = useStore(s => s.campaigns)
  const currentCampaignId = useStore(s => s.currentCampaignId)
  const allTroopers       = useStore(s => s.troopers)
  const campaignGear      = useStore(s => s.campaignGear)
  const setReq            = useStore(s => s.setReq)

  const campaign = campaigns.find(c => c.id === currentCampaignId) ?? null
  const reqEnabled = campaign?.reqEnabled ?? false
  const reqPool    = campaign?.req ?? 0

  const [selectedItem, setSelectedItem] = useState<GearItem | null>(null)

  // REQ edit
  const [editingReq, setEditingReq] = useState(false)
  const [reqSaving, setReqSaving]   = useState(false)
  const reqInputRef                 = useRef<HTMLInputElement>(null)

  async function handleSaveReq() {
    if (!reqInputRef.current) return
    const val = parseInt(reqInputRef.current.value, 10)
    if (isNaN(val) || val < 0) { setEditingReq(false); return }
    setReqSaving(true)
    try { await setReq(val) } finally { setReqSaving(false); setEditingReq(false) }
  }

  if (!campaign) return null

  return (
    <div className="p-4 flex flex-col gap-6 max-w-3xl mx-auto">

      {reqEnabled && (
        <section className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
          <div className="lbl text-[10px]">REQ Pool</div>
          {editingReq ? (
            <div className="flex items-center gap-2">
              <input
                ref={reqInputRef}
                type="number"
                min={0}
                defaultValue={reqPool}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') void handleSaveReq(); if (e.key === 'Escape') setEditingReq(false) }}
                className="bg-bg border border-border rounded text-ink text-[18px] font-mono px-2 py-1 w-24 focus:outline-none focus:border-accent"
              />
              <button type="button" onClick={() => void handleSaveReq()} disabled={reqSaving}
                className="px-3 py-1 text-[11px] text-warn border border-warn font-mono">
                {reqSaving ? 'SAVING…' : 'SAVE'}
              </button>
              <button type="button" onClick={() => setEditingReq(false)}
                className="px-3 py-1 text-[11px] text-muted border border-border font-mono">
                CANCEL
              </button>
            </div>
          ) : (
            <div className="flex items-baseline gap-3">
              <span className="text-[36px] font-mono font-bold text-warn leading-none">{reqPool}</span>
              <span className="text-[12px] text-muted font-mono">REQ</span>
              <button type="button" onClick={() => setEditingReq(true)}
                className="px-2 py-0.5 text-[10px] border border-border text-muted font-mono hover:border-accent hover:text-ink">
                EDIT
              </button>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-col gap-6">
        {SECTION_ORDER.map(type => {
          const items = GEAR.filter(g => g.geartype === type)
          return (
            <section key={type}>
              <div className="lbl text-[10px] mb-2">{SECTION_LABEL[type]}</div>
              <table className="w-full border-collapse text-[11px] font-mono">
                <thead>
                  <tr className="text-muted text-[10px] border-b border-border">
                    <th className="text-left py-1.5 pr-3 font-normal">NAME</th>
                    <th className="text-right py-1.5 px-3 font-normal whitespace-nowrap">MOB</th>
                    <th className="text-right py-1.5 px-3 font-normal whitespace-nowrap">REQ</th>
                    {reqEnabled && (
                      <>
                        <th className="text-right py-1.5 px-3 font-normal">STOCK</th>
                        <th className="text-right py-1.5 pl-3 font-normal">AVAIL</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const cg      = campaignGear.find(g => g.gearName === item.name)
                    const req     = effectiveReq(item, cg)
                    const name    = effectiveName(item, cg)
                    const tracked = reqEnabled && req > 0
                    const stock   = cg?.stock ?? 0
                    const used    = assignedCount(item.name, allTroopers)
                    const avail   = Math.max(0, stock - used)

                    return (
                      <tr key={item.name}
                        className="border-b border-border/50 hover:bg-surface/60 transition-colors"
                      >
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            className="text-left text-ink hover:text-accent underline underline-offset-2 decoration-border hover:decoration-accent transition-colors"
                          >
                            {name}
                          </button>
                          {cg?.customName && (
                            <span className="ml-1.5 text-[9px] text-muted">({item.name})</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-muted whitespace-nowrap">
                          {item.mobility_cost !== 0 ? item.mobility_cost : '—'}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <span className={req > 0 ? 'text-warn' : 'text-muted'}>
                            {req > 0 ? req : 'FREE'}
                          </span>
                        </td>
                        {reqEnabled && (
                          <>
                            <td className="py-2 px-3 text-right text-muted">
                              {tracked ? stock : '—'}
                            </td>
                            <td className="py-2 pl-3 text-right">
                              {tracked
                                ? <span className={avail > 0 ? 'text-ink' : 'text-muted'}>{avail}</span>
                                : <span className="text-muted">—</span>
                              }
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>
          )
        })}
      </div>

      {selectedItem && (
        <GearDetailModal
          item={selectedItem}
          campaignGear={campaignGear.find(g => g.gearName === selectedItem.name)}
          reqEnabled={reqEnabled}
          reqPool={reqPool}
          assignedCount={assignedCount(selectedItem.name, allTroopers)}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  )
}

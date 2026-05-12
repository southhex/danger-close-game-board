import { useState } from 'react'
import { Modal } from '../../components'
import { useStore } from '../../store'
import type { GearItem, CampaignGearItem } from '../../types'

interface Props {
  item:          GearItem
  campaignGear:  CampaignGearItem | undefined
  reqEnabled:    boolean
  reqPool:       number
  assignedCount: number
  onClose:       () => void
}

const BUY_QTYS = [1, 3, 5]

export default function GearDetailModal({ item, campaignGear, reqEnabled, reqPool, assignedCount, onClose }: Props) {
  const buyGearStock    = useStore(s => s.buyGearStock)
  const updateGearConfig = useStore(s => s.updateGearConfig)

  const effectiveReq  = campaignGear?.customReq !== null && campaignGear?.customReq !== undefined
    ? campaignGear.customReq
    : item.reqcost
  const effectiveName = campaignGear?.customName ?? item.name

  const stock   = campaignGear?.stock ?? 0
  const tracked = reqEnabled && effectiveReq > 0
  const avail   = Math.max(0, stock - assignedCount)

  // Config edit state
  const [customName, setCustomName] = useState(campaignGear?.customName ?? '')
  const [customReq, setCustomReq]   = useState<string>(
    campaignGear?.customReq !== null && campaignGear?.customReq !== undefined
      ? String(campaignGear.customReq)
      : String(item.reqcost)
  )
  const [savingConfig, setSavingConfig] = useState(false)
  const [configErr, setConfigErr]       = useState<string | null>(null)

  // Buy state
  const [buyQty, setBuyQty]   = useState(1)
  const [buying, setBuying]   = useState(false)
  const [buyErr, setBuyErr]   = useState<string | null>(null)
  const [buySuccess, setBuySuccess] = useState(false)

  const parsedReq = parseInt(customReq, 10)
  const validReq  = !isNaN(parsedReq) && parsedReq >= 0

  async function handleSaveConfig() {
    setSavingConfig(true)
    setConfigErr(null)
    try {
      const patch: { customName?: string | null; customReq?: number | null } = {}
      const trimmed = customName.trim()
      patch.customName = trimmed.length > 0 ? trimmed : null
      patch.customReq  = validReq ? parsedReq : null
      await updateGearConfig(item.name, patch)
    } catch (e) {
      setConfigErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingConfig(false)
    }
  }

  async function handleBuy(qty: number) {
    setBuying(true)
    setBuyErr(null)
    setBuySuccess(false)
    try {
      await buyGearStock(item.name, qty, effectiveReq)
      setBuySuccess(true)
      setTimeout(() => setBuySuccess(false), 1500)
    } catch (e) {
      setBuyErr(e instanceof Error ? e.message : 'Purchase failed')
    } finally {
      setBuying(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={effectiveName} width="min(92vw, 480px)">
      <div className="flex flex-col gap-5">

        {/* Info */}
        <section className="flex flex-col gap-2">
          <div className="text-[10px] text-secondary leading-relaxed">{item.properties}</div>
          {item.roll_table && (
            <div className="flex flex-col gap-0.5 mt-1">
              {item.roll_table.entries.map((e, i) => (
                <div key={i} className="flex gap-2 text-[10px]">
                  <span className="text-muted w-10 shrink-0">
                    {e.min === e.max ? e.min : `${e.min}–${e.max}`}
                  </span>
                  <span className="text-secondary">{e.result}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 text-[10px] text-muted mt-1">
            {item.mobility_cost !== 0 && (
              <span>MOB <span className="text-ink">{item.mobility_cost}</span></span>
            )}
            {item.max_uses > 0 && (
              <span>Uses <span className="text-ink">{item.max_uses}</span></span>
            )}
          </div>
        </section>

        <div className="border-t border-border" />

        {/* Configure */}
        <section className="flex flex-col gap-3">
          <div className="lbl text-[10px]">Configure</div>
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">Custom name</span>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder={item.name}
                className="bg-bg border border-border rounded text-ink text-[12px] font-mono px-2 py-1 focus:outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">REQ cost</span>
              <input
                type="number"
                min={0}
                value={customReq}
                onChange={e => setCustomReq(e.target.value)}
                className="bg-bg border border-border rounded text-ink text-[12px] font-mono px-2 py-1 w-24 focus:outline-none focus:border-accent"
              />
            </label>
          </div>
          {configErr && <div className="text-[11px] text-bad">{configErr}</div>}
          <button
            type="button"
            onClick={() => void handleSaveConfig()}
            disabled={savingConfig}
            className="self-start px-3 py-1 text-[11px] border border-accent text-accent font-mono hover:bg-accent/10"
          >
            {savingConfig ? 'SAVING…' : 'SAVE CONFIG'}
          </button>
        </section>

        {/* Stock — only when REQ is enabled and effective cost > 0 */}
        {reqEnabled && effectiveReq > 0 && (
          <>
            <div className="border-t border-border" />
            <section className="flex flex-col gap-3">
              <div className="lbl text-[10px]">Stock</div>
              <div className="flex gap-6 text-[11px] font-mono">
                <span className="text-muted">In stock <span className="text-ink">{stock}</span></span>
                <span className="text-muted">Assigned <span className="text-ink">{assignedCount}</span></span>
                <span className="text-muted">Available <span className={avail > 0 ? 'text-accent' : 'text-bad'}>{avail}</span></span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-[10px] text-muted">Buy more ({effectiveReq} REQ each)</div>
                <div className="flex items-center gap-2">
                  {BUY_QTYS.map(qty => {
                    const cost      = qty * effectiveReq
                    const canAfford = reqPool >= cost
                    return (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setBuyQty(qty)}
                        className={`px-3 py-1 text-[11px] border font-mono transition-colors ${
                          buyQty === qty
                            ? 'border-warn text-warn'
                            : 'border-border text-muted hover:border-accent hover:text-ink'
                        } ${!canAfford ? 'opacity-40' : ''}`}
                      >
                        +{qty} ({cost} REQ)
                      </button>
                    )
                  })}
                  <input
                    type="number"
                    min={1}
                    value={buyQty}
                    onChange={e => setBuyQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="bg-bg border border-border rounded text-ink text-[12px] font-mono px-2 py-1 w-16 focus:outline-none focus:border-accent"
                  />
                </div>
                {buyErr && <div className="text-[11px] text-bad">{buyErr}</div>}
                {buySuccess && <div className="text-[11px] text-accent">Purchased.</div>}
                <button
                  type="button"
                  onClick={() => void handleBuy(buyQty)}
                  disabled={buying || reqPool < buyQty * effectiveReq}
                  className="self-start px-3 py-1 text-[11px] border border-warn text-warn font-mono hover:bg-warn/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {buying ? 'BUYING…' : `BUY ${buyQty} (−${buyQty * effectiveReq} REQ)`}
                </button>
              </div>
            </section>
          </>
        )}

      </div>
    </Modal>
  )
}

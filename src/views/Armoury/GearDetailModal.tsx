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

export default function GearDetailModal({ item, campaignGear, reqEnabled, reqPool, assignedCount, onClose }: Props) {
  const buyGearStock     = useStore(s => s.buyGearStock)
  const updateGearConfig = useStore(s => s.updateGearConfig)

  const effectiveReq  = campaignGear?.customReq !== null && campaignGear?.customReq !== undefined
    ? campaignGear.customReq
    : item.reqcost

  const stock   = campaignGear?.stock ?? 0
  const avail   = Math.max(0, stock - assignedCount)

  const isCustomised = !!(campaignGear?.customName || (campaignGear?.customReq !== null && campaignGear?.customReq !== undefined))

  const [nameVal, setNameVal] = useState(campaignGear?.customName ?? item.name)
  const [reqVal, setReqVal]   = useState<string>(
    campaignGear?.customReq !== null && campaignGear?.customReq !== undefined
      ? String(campaignGear.customReq)
      : String(item.reqcost)
  )
  const [saving, setSaving]   = useState(false)
  const [configErr, setConfigErr] = useState<string | null>(null)

  // Buy state
  const [buyQty, setBuyQty]       = useState(1)
  const [buying, setBuying]       = useState(false)
  const [buyErr, setBuyErr]       = useState<string | null>(null)
  const [buySuccess, setBuySuccess] = useState(false)

  const parsedReq = parseInt(reqVal, 10)
  const validReq  = !isNaN(parsedReq) && parsedReq >= 0

  async function saveConfig(patch: { customName?: string | null; customReq?: number | null }) {
    setSaving(true)
    setConfigErr(null)
    try {
      await updateGearConfig(item.name, patch)
    } catch (e) {
      setConfigErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function handleNameBlur() {
    const trimmed = nameVal.trim()
    const next = trimmed.length > 0 && trimmed !== item.name ? trimmed : null
    if (next !== (campaignGear?.customName ?? null)) {
      void saveConfig({ customName: next })
    }
  }

  function handleReqBlur() {
    if (!validReq) return
    const next = parsedReq !== item.reqcost ? parsedReq : null
    if (next !== (campaignGear?.customReq ?? null)) {
      void saveConfig({ customReq: next })
    }
  }

  async function handleReset() {
    setNameVal(item.name)
    setReqVal(String(item.reqcost))
    await saveConfig({ customName: null, customReq: null })
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
    <Modal open onClose={onClose} width="min(92vw, 480px)">
      <div className="flex flex-col gap-5">

        {/* Editable title row */}
        <div className="flex items-center gap-2 -mt-1">
          <input
            type="text"
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            disabled={saving}
            className="flex-1 bg-transparent text-ink text-[14px] font-mono font-bold focus:outline-none border-b border-transparent focus:border-accent transition-colors placeholder:text-muted"
          />
          {isCustomised && (
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={saving}
              className="shrink-0 px-2 py-0.5 text-[9px] border border-border text-muted font-mono hover:border-bad hover:text-bad transition-colors"
            >
              RESET
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-muted hover:text-ink font-mono text-[14px] leading-none px-1 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

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
          <div className="flex gap-4 items-center text-[10px] text-muted mt-1">
            {item.mobility_cost !== 0 && (
              <span>MOB <span className="text-ink">{item.mobility_cost}</span></span>
            )}
            {item.max_uses > 0 && (
              <span>Uses <span className="text-ink">{item.max_uses}</span></span>
            )}
            <span className="flex items-center gap-1">
              REQ
              <input
                type="number"
                min={0}
                value={reqVal}
                onChange={e => setReqVal(e.target.value)}
                onBlur={handleReqBlur}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                disabled={saving}
                className="w-12 bg-transparent text-ink text-[10px] font-mono border-b border-transparent focus:border-accent focus:outline-none text-center"
              />
            </span>
          </div>
          {configErr && <div className="text-[10px] text-bad">{configErr}</div>}
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

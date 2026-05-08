import { useRef, useState } from 'react'
import { useStore } from '../../store'
import { GEAR } from '../../data/gear'
import type { GearItem, Trooper } from '../../types'
import GearGrid from './GearGrid'
import PurchaseConfirmDialog from './PurchaseConfirmDialog'

const GEAR_SLOT: Record<GearItem['geartype'], keyof Pick<Trooper, 'armor' | 'weapon' | 'special_weapon' | 'special_gear'>> = {
  armor:            'armor',
  weapon:           'weapon',
  specialweapon:    'special_weapon',
  specialequipment: 'special_gear',
}

export default function Armoury() {
  const campaigns         = useStore(s => s.campaigns)
  const currentCampaignId = useStore(s => s.currentCampaignId)
  const allTroopers       = useStore(s => s.troopers)
  const setReq            = useStore(s => s.setReq)
  const spendReq          = useStore(s => s.spendReq)

  const campaign = campaigns.find(c => c.id === currentCampaignId) ?? null

  const reqEnabled = campaign?.reqEnabled ?? false
  const reqPool    = campaign?.req ?? 0

  const troopers = allTroopers.filter(t => !t.recovering)

  const [selectedId, setSelectedId]           = useState<string | null>(null)
  const [pendingItem, setPendingItem]         = useState<GearItem | null>(null)
  const [confirmOpen, setConfirmOpen]         = useState(false)
  const [busy, setBusy]                       = useState(false)
  const [err, setErr]                         = useState<string | null>(null)

  // REQ edit
  const [editingReq, setEditingReq]   = useState(false)
  const [reqSaving, setReqSaving]     = useState(false)
  const reqInputRef                   = useRef<HTMLInputElement>(null)

  const selectedTrooper = troopers.find(t => t.id === selectedId) ?? null

  function handleBuy(item: GearItem) {
    if (!selectedId) return
    setPendingItem(item)
    setConfirmOpen(true)
    setErr(null)
  }

  async function handleConfirmPurchase() {
    if (!pendingItem || !selectedId) return
    setBusy(true)
    setErr(null)
    try {
      const slot      = GEAR_SLOT[pendingItem.geartype]
      const amount    = reqEnabled ? pendingItem.reqcost : 0
      await spendReq(amount, selectedId, { slot, name: pendingItem.name })
      setConfirmOpen(false)
      setPendingItem(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Purchase failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveReq() {
    if (!reqInputRef.current) return
    const val = parseInt(reqInputRef.current.value, 10)
    if (isNaN(val) || val < 0) { setEditingReq(false); return }
    setReqSaving(true)
    try {
      await setReq(val)
    } finally {
      setReqSaving(false)
      setEditingReq(false)
    }
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
              <button
                type="button"
                onClick={() => void handleSaveReq()}
                disabled={reqSaving}
                className="px-3 py-1 text-[11px] text-warn border border-warn font-mono"
              >{reqSaving ? 'SAVING…' : 'SAVE'}</button>
              <button
                type="button"
                onClick={() => setEditingReq(false)}
                className="px-3 py-1 text-[11px] text-muted border border-border font-mono"
              >CANCEL</button>
            </div>
          ) : (
            <div className="flex items-baseline gap-3">
              <span className="text-[36px] font-mono font-bold text-warn leading-none">{reqPool}</span>
              <span className="text-[12px] text-muted font-mono">REQ</span>
              <button
                type="button"
                onClick={() => setEditingReq(true)}
                className="px-2 py-0.5 text-[10px] border border-border text-muted font-mono hover:border-accent hover:text-ink"
              >EDIT</button>
            </div>
          )}
        </section>
      )}

      <section className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
        <div className="lbl text-[10px]">Assign Gear To</div>
        <select
          value={selectedId ?? ''}
          onChange={e => setSelectedId(e.target.value || null)}
          className="bg-bg border border-border rounded text-ink text-[12px] font-mono px-2 py-1.5 focus:outline-none focus:border-accent"
        >
          <option value="">— select trooper —</option>
          {troopers.map(t => (
            <option key={t.id} value={t.id}>
              {t.callsign || t.fullname}
              {t.squadId ? '' : ' (unassigned)'}
            </option>
          ))}
        </select>
        {selectedTrooper && (
          <div className="text-[10px] text-muted font-mono leading-relaxed">
            Armor: <span className="text-ink">{selectedTrooper.armor || '—'}</span>
            {'  '}Weapon: <span className="text-ink">{selectedTrooper.weapon || '—'}</span>
            {'  '}SW: <span className="text-ink">{selectedTrooper.special_weapon || '—'}</span>
            {'  '}SE: <span className="text-ink">{selectedTrooper.special_gear || '—'}</span>
          </div>
        )}
      </section>

      {err && <div className="text-[11px] text-bad font-mono">{err}</div>}

      <div className="flex flex-col gap-6">
        {(['armor', 'weapon', 'specialweapon', 'specialequipment'] as GearItem['geartype'][]).map(type => (
          <GearGrid
            key={type}
            items={GEAR}
            geartype={type}
            selectedTrooper={selectedId}
            reqEnabled={reqEnabled}
            reqPool={reqPool}
            onBuy={handleBuy}
          />
        ))}
      </div>

      <PurchaseConfirmDialog
        open={confirmOpen}
        item={pendingItem}
        trooper={selectedTrooper}
        reqEnabled={reqEnabled}
        onConfirm={() => void handleConfirmPurchase()}
        onCancel={() => { setConfirmOpen(false); setPendingItem(null) }}
        busy={busy}
      />
    </div>
  )
}

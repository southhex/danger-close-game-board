import { Modal } from '../../components'
import type { GearItem, Trooper } from '../../types'

interface Props {
  open:       boolean
  item:       GearItem | null
  trooper:    Trooper | null
  reqEnabled: boolean
  onConfirm:  () => void
  onCancel:   () => void
  busy:       boolean
}

const SLOT_LABEL: Record<GearItem['geartype'], string> = {
  armor:            'armor',
  weapon:           'weapon',
  specialweapon:    'special weapon',
  specialequipment: 'special equipment',
}

export default function PurchaseConfirmDialog({ open, item, trooper, reqEnabled, onConfirm, onCancel, busy }: Props) {
  if (!item || !trooper) return null

  const hasCost = reqEnabled && item.reqcost > 0

  return (
    <Modal open={open} onClose={onCancel} title="Confirm Assignment" width="min(90vw, 380px)">
      <div className="flex flex-col gap-3">
        <div className="text-[12px] text-ink font-mono">
          Assign <span className="text-warn">{item.name}</span> to{' '}
          <span className="text-warn">{trooper.callsign || trooper.fullname}</span>
        </div>

        <div className="text-[11px] text-muted leading-relaxed">
          This replaces the trooper&apos;s current {SLOT_LABEL[item.geartype]}.
          {hasCost && (
            <> Costs <span className="text-warn font-bold">{item.reqcost} REQ</span>.</>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3 py-1 text-[11px] text-muted border border-border font-mono"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-3 py-1 text-[11px] text-warn border border-warn font-mono"
          >
            {busy ? 'SAVING…' : hasCost ? `CONFIRM (−${item.reqcost} REQ)` : 'CONFIRM'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

import { useState } from 'react'
import { useStore } from '../../store'
import { Modal } from '../../components'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CampaignConfigModal({ open, onClose }: Props) {
  const campaigns            = useStore(s => s.campaigns)
  const currentCampaignId    = useStore(s => s.currentCampaignId)
  const setCampaignReqEnabled = useStore(s => s.setCampaignReqEnabled)
  const duplicateCampaign    = useStore(s => s.duplicateCampaign)
  const deleteCampaign       = useStore(s => s.deleteCampaign)

  const campaign = campaigns.find(c => c.id === currentCampaignId) ?? null

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deletePending, setDeletePending] = useState(false)
  const [duplicating, setDuplicating]     = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  if (!campaign) return null

  const canDelete = deleteConfirm === campaign.name

  const handleToggleReq = () => {
    void setCampaignReqEnabled(!campaign.reqEnabled)
  }

  const handleDuplicate = async () => {
    setDuplicating(true)
    setError(null)
    try {
      await duplicateCampaign(campaign.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duplicate failed')
    } finally {
      setDuplicating(false)
    }
  }

  const handleDelete = async () => {
    if (!canDelete) return
    setError(null)
    try {
      await deleteCampaign(campaign.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Campaign Settings" width="min(90vw, 400px)">
      <div className="flex flex-col gap-5">

        {/* REQ tracking */}
        <div className="flex flex-col gap-2">
          <div className="lbl text-[10px]">Requisition</div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-ink font-mono">Track REQ Points</span>
            <button
              role="switch"
              aria-checked={campaign.reqEnabled ?? false}
              onClick={handleToggleReq}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${campaign.reqEnabled ? 'bg-accent' : 'bg-border'}`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${campaign.reqEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
          {campaign.reqEnabled && (
            <div className="text-[11px] text-muted font-mono">
              Current balance: <span className="text-ink font-bold">{campaign.req ?? 0}</span> REQ — edit in Armoury
            </div>
          )}
        </div>

        <div className="border-t border-border" />

        {/* Campaign management */}
        <div className="flex flex-col gap-2">
          <div className="lbl text-[10px]">Campaign Management</div>

          <button
            type="button"
            disabled={duplicating}
            onClick={() => { void handleDuplicate() }}
            className="w-full py-2 text-[11px] font-mono border border-border text-ink hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
          >
            {duplicating ? 'DUPLICATING…' : 'DUPLICATE CAMPAIGN'}
          </button>

          {!deletePending ? (
            <button
              type="button"
              onClick={() => setDeletePending(true)}
              className="w-full py-2 text-[11px] font-mono border border-bad/40 text-bad hover:border-bad transition-colors"
            >
              DELETE CAMPAIGN
            </button>
          ) : (
            <div className="flex flex-col gap-2 border border-bad/40 rounded-md p-3">
              <div className="text-[11px] text-bad font-mono">
                This will permanently delete the campaign and all its data. Type the campaign name to confirm.
              </div>
              <input
                type="text"
                placeholder={campaign.name}
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                className="bg-bg border border-border rounded-md text-ink text-[12px] px-2.5 py-1.5 w-full focus:outline-none focus:border-bad"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setDeletePending(false); setDeleteConfirm('') }}
                  className="flex-1 py-1.5 text-[11px] font-mono border border-border text-muted hover:text-ink transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  disabled={!canDelete}
                  onClick={() => { void handleDelete() }}
                  className="flex-1 py-1.5 text-[11px] font-mono border border-bad text-bad hover:bg-bad hover:text-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  DELETE
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <div className="text-[11px] text-bad font-mono">{error}</div>}
      </div>
    </Modal>
  )
}

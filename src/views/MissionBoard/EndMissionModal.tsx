import { useState } from 'react'
import { Modal, StatusBadge } from '../../components'
import { useStore } from '../../store'
import { isDeployed } from '../../utils/gameRules'

interface Props {
  open: boolean
  onClose: () => void
}

type Outcome = 'victory' | 'defeat' | 'aborted'

const OUTCOME_OPTS: { value: Outcome; label: string; cls: string }[] = [
  { value: 'victory', label: 'VICTORY', cls: 'border-accent text-accent' },
  { value: 'defeat',  label: 'DEFEAT',  cls: 'border-bad text-bad' },
  { value: 'aborted', label: 'ABORTED', cls: 'border-warn text-warn' },
]

export default function EndMissionModal({ open, onClose }: Props) {
  const mission       = useStore(s => s.mission)
  const allTroopers   = useStore(s => s.troopers)
  const campaigns     = useStore(s => s.campaigns)
  const currentCampaignId = useStore(s => s.currentCampaignId)
  const completeMission   = useStore(s => s.completeMission)

  const [outcome, setOutcome]       = useState<Outcome>('victory')
  const [fieldReport, setFieldReport] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  if (!mission) return null

  const deployedTroopers = allTroopers.filter(t => isDeployed(t, mission))
  const survivors = deployedTroopers.filter(t => t.status !== 'dead')
  const lost      = deployedTroopers.filter(t => t.status === 'dead')

  const campaign   = campaigns.find(c => c.id === currentCampaignId)
  const reqEnabled = campaign?.reqEnabled ?? false
  const reqAward   = reqEnabled ? survivors.length : 0

  async function handleConfirm() {
    if (!mission?.id || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await completeMission(mission.id, { fieldReport, outcome })
      // store navigates to HQ on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete mission')
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { if (!submitting) onClose() }} title="END MISSION" width="min(90vw, 560px)">
      <div className="flex flex-col gap-4 text-[11px] font-mono">

        {/* Outcome selector */}
        <div>
          <div className="lbl text-[10px] mb-1">OUTCOME</div>
          <div className="flex gap-2">
            {OUTCOME_OPTS.map(o => (
              <button
                key={o.value}
                onClick={() => setOutcome(o.value)}
                className={`flex-1 py-1.5 border text-[10px] ${
                  outcome === o.value ? o.cls : 'border-border text-muted'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Survivor preview */}
        <div>
          <div className="lbl text-[10px] mb-1">SURVIVORS ({survivors.length})</div>
          {survivors.length > 0 ? (
            <div className="flex flex-col gap-1">
              {survivors.map(t => (
                <div key={t.id} className="flex items-center gap-2 border border-border px-2 py-1">
                  <span className="text-ink flex-1">{t.name}</span>
                  <StatusBadge status={t.status} />
                  <span className="text-muted">GRIT {t.grit}/{t.grit_max}</span>
                  {(t.status === 'wounded' || t.wasBleedingOut) && (
                    <span className="text-warn text-[9px]">RECOVERING</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted">No survivors.</div>
          )}
        </div>

        {lost.length > 0 && (
          <div>
            <div className="lbl text-[10px] mb-1 text-bad">LOST ({lost.length})</div>
            <div className="flex flex-col gap-1">
              {lost.map(t => (
                <div key={t.id} className="border border-bad/40 px-2 py-1 text-bad">{t.name}</div>
              ))}
            </div>
          </div>
        )}

        {/* REQ summary */}
        {reqEnabled && (
          <div className="border border-border px-2 py-1.5">
            <span className="text-muted">REQ AWARD: </span>
            <span className="text-ink">+{reqAward}</span>
            <span className="text-muted text-[9px] ml-1">({survivors.length} survivor{survivors.length !== 1 ? 's' : ''})</span>
          </div>
        )}

        {/* Field report */}
        <div>
          <div className="lbl text-[10px] mb-1">FIELD REPORT <span className="text-muted">(OPTIONAL)</span></div>
          <textarea
            value={fieldReport}
            onChange={e => setFieldReport(e.target.value)}
            rows={4}
            placeholder="After-action notes, narrative, observations…"
            className="w-full bg-bg border border-border text-ink font-mono text-[11px] px-2 py-1.5 resize-none focus:outline-none focus:border-accent"
          />
        </div>

        {error && (
          <div className="text-bad border border-bad/40 px-2 py-1 text-[10px]">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-3 py-2 border border-border text-muted text-[10px] disabled:opacity-40"
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 px-3 py-2 border border-ok text-ok text-[10px] disabled:opacity-40"
          >
            {submitting ? 'CONFIRMING…' : 'CONFIRM END MISSION'}
          </button>
        </div>

        <div className="text-[9px] text-muted">
          Survivors carry grit bonus into next mission. Wounded / BleedingOut troopers flagged as Recovering.
        </div>
      </div>
    </Modal>
  )
}

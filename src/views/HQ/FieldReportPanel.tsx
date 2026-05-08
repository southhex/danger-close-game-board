import { useState } from 'react'
import { Modal } from '../../components'
import type { Mission } from '../../types'

interface Props {
  mission: Mission
  open: boolean
  onClose: () => void
}

const OUTCOME_LABEL: Record<string, string> = {
  victory: 'Victory', defeat: 'Defeat', aborted: 'Aborted',
}

const OUTCOME_COLOR: Record<string, string> = {
  victory: 'text-accent', defeat: 'text-bad', aborted: 'text-warn',
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString() } catch { return iso }
}

export default function FieldReportPanel({ mission, open, onClose }: Props) {
  const [report, setReport] = useState(mission.fieldReport ?? '')
  const [saving, setSaving]  = useState(false)
  const [saved, setSaved]    = useState(false)

  const isEditable = mission.status === 'completed'

  async function handleSave() {
    if (!isEditable || saving) return
    setSaving(true)
    try {
      // Dynamic import to avoid circular dep
      const { patchMissionFieldReportApi } = await import('../../api/client')
      await patchMissionFieldReportApi(mission.id, report)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // swallow — non-critical
    } finally {
      setSaving(false)
    }
  }

  const sectors = mission.state?.sectors ?? mission.sectors ?? []
  const cleared = sectors.filter(s => s.status === 'cleared').length

  return (
    <Modal open={open} onClose={onClose} title="Field Report" width="min(90vw, 640px)">
      <div className="flex flex-col gap-4">
        {/* Mission header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[14px] font-bold text-ink font-mono">{mission.name || 'Untitled Mission'}</div>
            <div className="text-[10px] text-muted font-mono uppercase mt-0.5">
              Completed {formatDate(mission.completed_at)}
            </div>
          </div>
          {mission.outcome && (
            <div className={`text-[12px] font-bold font-mono uppercase ${OUTCOME_COLOR[mission.outcome] ?? 'text-muted'}`}>
              {OUTCOME_LABEL[mission.outcome]}
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Sectors', value: `${cleared}/${sectors.length}` },
            { label: 'REQ Awarded', value: mission.awardedReq ?? 0 },
            { label: 'Outcome', value: OUTCOME_LABEL[mission.outcome ?? ''] ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-bg border border-border rounded-md p-2 text-center">
              <div className="text-[10px] text-muted font-mono uppercase">{label}</div>
              <div className="text-[14px] font-bold text-ink font-mono">{value}</div>
            </div>
          ))}
        </div>

        {/* Field report text */}
        <div className="flex flex-col gap-1">
          <div className="lbl text-[10px]">Field Report</div>
          {isEditable ? (
            <>
              <textarea
                value={report}
                onChange={e => setReport(e.target.value)}
                rows={6}
                placeholder="After-action notes, narrative, observations…"
                className="w-full bg-bg border border-border text-ink font-mono text-[12px] px-2.5 py-2 resize-none focus:outline-none focus:border-accent rounded-md"
              />
              <div className="flex items-center justify-end gap-2 mt-1">
                {saved && <span className="text-[11px] text-accent font-mono">Saved</span>}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1 text-[11px] border border-accent text-accent font-mono disabled:opacity-40"
                >{saving ? 'Saving…' : 'Save Report'}</button>
              </div>
            </>
          ) : (
            <div className="bg-bg border border-border rounded-md p-3 text-[12px] text-muted font-mono whitespace-pre-wrap min-h-[4rem]">
              {mission.fieldReport || <span className="italic">No field report.</span>}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

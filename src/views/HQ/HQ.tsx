import { useRef, useState } from 'react'
import { useStore } from '../../store'

export default function HQ() {
  const campaigns         = useStore(s => s.campaigns)
  const currentCampaignId = useStore(s => s.currentCampaignId)
  const renameCampaign    = useStore(s => s.renameCampaign)
  const prepareMission    = useStore(s => s.prepareMission)
  const setView           = useStore(s => s.setView)
  const allTroopers       = useStore(s => s.troopers)
  const mission           = useStore(s => s.mission)

  const campaign = campaigns.find(c => c.id === currentCampaignId) ?? null

  const [nameError, setNameError] = useState<string | null>(null)
  const [descError, setDescError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  const trooperCount = allTroopers.length
  const activeCount  = allTroopers.filter(t => t.active).length
  const lostCount    = allTroopers.filter(t => t.status === 'dead').length

  const handleNameBlur = async () => {
    if (!campaign || !nameRef.current) return
    const val = nameRef.current.value.trim()
    if (!val) { nameRef.current.value = campaign.name; return }
    if (val === campaign.name) return
    setNameError(null)
    try {
      await renameCampaign(campaign.id, val, campaign.description)
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Save failed')
      nameRef.current.value = campaign.name
    }
  }

  const handleDescBlur = async () => {
    if (!campaign || !descRef.current) return
    const val = descRef.current.value
    if (val === campaign.description) return
    setDescError(null)
    try {
      await renameCampaign(campaign.id, campaign.name, val)
    } catch (err) {
      setDescError(err instanceof Error ? err.message : 'Save failed')
      descRef.current.value = campaign.description
    }
  }

  if (!campaign) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="bg-surface border border-border p-6 text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-2">HQ</div>
          <div className="text-[12px] text-muted">Select a campaign to continue.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4 max-w-xl">
      {/* Campaign header */}
      <section className="bg-surface border border-border p-4 flex flex-col gap-3">
        <div className="text-[10px] uppercase tracking-widest text-muted">Campaign</div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-muted">Name</label>
          <input
            ref={nameRef}
            type="text"
            defaultValue={campaign.name}
            onBlur={handleNameBlur}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            className="bg-bg border border-border text-ink text-[13px] px-2.5 py-1.5 font-mono w-full focus:outline-none focus:border-accent"
          />
          {nameError && <div className="text-[11px] text-red-400">{nameError}</div>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-muted">Description</label>
          <textarea
            ref={descRef}
            defaultValue={campaign.description}
            onBlur={handleDescBlur}
            rows={3}
            className="bg-bg border border-border text-ink text-[12px] px-2.5 py-1.5 font-mono w-full resize-none focus:outline-none focus:border-accent"
          />
          {descError && <div className="text-[11px] text-red-400">{descError}</div>}
        </div>
      </section>

      {/* Stats */}
      <section className="flex gap-2">
        {[
          { label: 'TROOPERS', value: trooperCount },
          { label: 'ACTIVE',   value: activeCount },
          { label: 'LOST',     value: lostCount },
        ].map(({ label, value }) => (
          <div key={label} className="flex-1 bg-surface border border-border p-3 flex flex-col gap-1 items-center">
            <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
            <div className="text-[22px] font-bold text-ink leading-none">{value}</div>
          </div>
        ))}
      </section>

      {/* Mission status */}
      {mission === null ? (
        <button
          onClick={prepareMission}
          className="bg-surface border border-border text-accent text-[12px] uppercase tracking-widest px-4 py-2.5 hover:border-accent transition-colors text-left"
        >
          + Start Quick Mission
        </button>
      ) : (
        <div className="bg-surface border border-border p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold tracking-wide bg-accent text-bg px-1.5 py-0.5">LIVE</span>
            <span className="text-[12px] text-ink">{mission.name}</span>
          </div>
          <button
            onClick={() => setView('mission')}
            className="text-[12px] text-accent hover:underline"
          >
            → Mission
          </button>
        </div>
      )}
    </div>
  )
}

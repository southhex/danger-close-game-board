import { useRef, useState } from 'react'
import { useStore } from '../../store'
import type { Airspace } from '../../types'

const AIRSPACE_OPTIONS: { value: Airspace; label: string }[] = [
  { value: 'friendly',  label: 'Friendly'  },
  { value: 'contested', label: 'Contested' },
  { value: 'denied',    label: 'Denied'    },
]

export default function CampaignOverviewCard() {
  const campaigns         = useStore(s => s.campaigns)
  const currentCampaignId = useStore(s => s.currentCampaignId)
  const renameCampaign    = useStore(s => s.renameCampaign)
  const setCampaignAirspace   = useStore(s => s.setCampaignAirspace)
  const setCampaignReqEnabled = useStore(s => s.setCampaignReqEnabled)

  const campaign = campaigns.find(c => c.id === currentCampaignId) ?? null

  const [nameError, setNameError] = useState<string | null>(null)
  const [descError, setDescError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  if (!campaign) return null

  const handleNameBlur = async () => {
    if (!nameRef.current) return
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
    if (!descRef.current) return
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

  return (
    <section className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="lbl">Campaign</div>

      <div className="flex flex-col gap-1">
        <label className="lbl text-[10px]">Name</label>
        <input
          ref={nameRef}
          type="text"
          defaultValue={campaign.name}
          onBlur={handleNameBlur}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className="bg-bg border border-border rounded-md text-ink text-[13px] px-2.5 py-1.5 w-full focus:outline-none focus:border-accent"
        />
        {nameError && <div className="text-[11px] text-bad">{nameError}</div>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="lbl text-[10px]">Description</label>
        <textarea
          ref={descRef}
          defaultValue={campaign.description}
          onBlur={handleDescBlur}
          rows={2}
          className="bg-bg border border-border rounded-md text-ink text-[12px] px-2.5 py-1.5 w-full resize-none focus:outline-none focus:border-accent"
        />
        {descError && <div className="text-[11px] text-bad">{descError}</div>}
      </div>

      <div className="flex flex-col gap-1">
        <div className="lbl text-[10px]">Default Airspace</div>
        <div className="flex gap-1">
          {AIRSPACE_OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { void setCampaignAirspace(o.value) }}
              className={`px-2 py-0.5 text-[10px] border font-mono flex-1 ${campaign.defaultAirspace === o.value ? 'border-warn text-warn' : 'border-border text-muted'}`}
            >{o.label}</button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-[12px] text-ink font-mono cursor-pointer select-none">
          <input
            type="checkbox"
            checked={campaign.reqEnabled ?? false}
            onChange={e => { void setCampaignReqEnabled(e.target.checked) }}
            className="accent-warn"
          />
          <span>REQ Tracking</span>
        </label>
        {campaign.reqEnabled && (
          <div className="flex items-center gap-1 text-[12px] text-muted font-mono">
            <span className="text-ink font-bold">{campaign.req ?? 0}</span>
            <span>REQ</span>
            <span className="text-[10px] text-muted ml-1">(edit in Armoury)</span>
          </div>
        )}
      </div>
    </section>
  )
}

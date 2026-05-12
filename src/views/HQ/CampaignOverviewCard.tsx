import { useRef, useState } from 'react'
import { useStore } from '../../store'
import type { Airspace } from '../../types'
import CampaignConfigModal from './CampaignConfigModal'

const AIRSPACE_OPTIONS: { value: Airspace; label: string }[] = [
  { value: 'friendly',  label: 'Friendly'  },
  { value: 'contested', label: 'Contested' },
  { value: 'denied',    label: 'Denied'    },
]

export default function CampaignOverviewCard() {
  const campaigns           = useStore(s => s.campaigns)
  const currentCampaignId   = useStore(s => s.currentCampaignId)
  const renameCampaign      = useStore(s => s.renameCampaign)
  const setCampaignAirspace = useStore(s => s.setCampaignAirspace)

  const campaign = campaigns.find(c => c.id === currentCampaignId) ?? null

  const [nameError, setNameError] = useState<string | null>(null)
  const [descError, setDescError] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
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
    <>
      <section key={campaign.id} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        {/* Editable campaign name as header */}
        <div className="flex flex-col gap-1">
          <input
            ref={nameRef}
            type="text"
            defaultValue={campaign.name}
            onBlur={handleNameBlur}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            className="bg-transparent text-ink text-[15px] font-bold font-mono w-full focus:outline-none focus:border-b focus:border-accent border-b border-transparent pb-0.5 leading-tight"
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

        {/* Footer: REQ indicator + config icon */}
        <div className="flex items-center justify-between mt-1">
          <div className="text-[10px] text-muted font-mono">
            {campaign.reqEnabled
              ? <span><span className="text-ink font-bold">{campaign.req ?? 0}</span> REQ</span>
              : <span className="opacity-0 select-none">·</span>
            }
          </div>
          <button
            type="button"
            onClick={() => setConfigOpen(true)}
            title="Campaign settings"
            className="text-muted hover:text-ink transition-colors p-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </section>

      <CampaignConfigModal open={configOpen} onClose={() => setConfigOpen(false)} />
    </>
  )
}

import { useState } from 'react'
import { useStore } from '../../store'
import CampaignOverviewCard from './CampaignOverviewCard'
import MissionSummaryCard from './MissionSummaryCard'
import FieldReportPanel from './FieldReportPanel'
import type { Mission } from '../../types'

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString() } catch { return iso }
}

const OUTCOME_COLOR: Record<string, string> = {
  victory: 'text-accent', defeat: 'text-bad', aborted: 'text-warn',
}

export default function HQ() {
  const campaigns         = useStore(s => s.campaigns)
  const currentCampaignId = useStore(s => s.currentCampaignId)
  const allTroopers       = useStore(s => s.troopers)
  const mission           = useStore(s => s.mission)
  const missions          = useStore(s => s.missions)
  const squads            = useStore(s => s.squads)
  const openBuilder       = useStore(s => s.openMissionBuilder)
  const setView           = useStore(s => s.setView)

  const campaign = campaigns.find(c => c.id === currentCampaignId) ?? null

  const [fieldReportMission, setFieldReportMission] = useState<Mission | null>(null)

  if (!campaign) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="bg-surface border border-border rounded-xl p-6 text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-2">HQ</div>
          <div className="text-[12px] text-muted">Select a campaign to continue.</div>
        </div>
      </div>
    )
  }

  const blueprints = missions.filter(m => m.status === 'blueprint')
  const completed  = missions.filter(m => m.status === 'completed')
    .slice()
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))

  const liveMission = mission

  // Squad roster stats
  const squadsWithCounts = squads.map(sq => {
    const members   = allTroopers.filter(t => t.squadId === sq.id)
    const recovering = members.filter(t => t.recovering).length
    return { squad: sq, memberCount: members.length, recovering }
  })

  return (
    <div className="p-4 md:grid md:grid-cols-2 md:gap-4 md:items-start flex flex-col gap-4 max-w-3xl">
      {/* Left column: campaign overview + squads */}
      <div className="flex flex-col gap-4">
        <CampaignOverviewCard />

        {/* Squad roster */}
        {squads.length > 0 && (
          <section className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
            <div className="lbl">Squads</div>
            <div className="flex flex-col gap-1.5">
              {squadsWithCounts.map(({ squad, memberCount, recovering }) => (
                <button
                  key={squad.id}
                  type="button"
                  onClick={() => setView('barracks')}
                  className="flex items-center justify-between px-3 py-2 bg-bg border border-border rounded-md hover:border-accent transition-colors text-left"
                >
                  <div>
                    <span className="text-[12px] text-ink font-mono">{squad.name}</span>
                    {squad.callsign && (
                      <span className="text-[10px] text-muted font-mono ml-2">{squad.callsign}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted font-mono">
                    {recovering > 0 && (
                      <span className="text-warn" title={`${recovering} recovering`}>● {recovering} rec</span>
                    )}
                    <span>{memberCount}/5</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Right column: current mission + available missions + history */}
      <div className="flex flex-col gap-4">
        {/* Current mission */}
        {liveMission && (
          <section className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="lbl">Current Mission</div>
              <span className="text-[9px] font-bold tracking-wide bg-accent text-bg rounded-pill px-2 py-0.5">LIVE</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[13px] font-bold text-ink font-mono">{liveMission.name}</div>
                <div className="text-[10px] text-muted font-mono uppercase mt-0.5">
                  {liveMission.sectors.filter(s => s.status === 'cleared').length}/{liveMission.sectors.length} sectors cleared
                  {' · '}Momentum {liveMission.momentum >= 0 ? '+' : ''}{liveMission.momentum}
                </div>
              </div>
              <button
                onClick={() => setView('mission')}
                className="px-3 py-1.5 text-[11px] border border-accent text-accent font-mono shrink-0"
              >RESUME</button>
            </div>
          </section>
        )}

        {/* Available missions (blueprints) */}
        <section className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="lbl">Available Missions</div>
            <button
              onClick={() => openBuilder(null)}
              className="text-[11px] text-accent font-mono hover:underline"
            >+ NEW MISSION</button>
          </div>

          {blueprints.length === 0 ? (
            <div className="text-[11px] text-muted font-mono">
              No blueprints. Click "+ NEW MISSION" to plan one.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {blueprints.map(m => (
                <MissionSummaryCard key={m.id} mission={m} />
              ))}
            </div>
          )}
        </section>

        {/* Mission history */}
        {completed.length > 0 && (
          <section className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="lbl">Mission History</div>
            <div className="flex flex-col gap-2">
              {completed.map(m => {
                const squad = squads.find(sq => sq.id === m.squadId)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFieldReportMission(m)}
                    className="w-full text-left bg-bg border border-border rounded-md p-3 hover:border-accent transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[12px] text-ink font-mono truncate">{m.name || 'Untitled'}</div>
                      {m.outcome && (
                        <div className={`text-[10px] font-bold font-mono uppercase shrink-0 ${OUTCOME_COLOR[m.outcome] ?? 'text-muted'}`}>
                          {m.outcome}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-muted font-mono uppercase mt-0.5">
                      {formatDate(m.completed_at)}
                      {squad ? ` · ${squad.name}` : ''}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* Field report modal */}
      {fieldReportMission && (
        <FieldReportPanel
          mission={fieldReportMission}
          open
          onClose={() => setFieldReportMission(null)}
        />
      )}
    </div>
  )
}

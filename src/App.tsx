import { type ComponentType, useEffect, useState } from 'react'
import { ToastProvider } from './components'
import { useStore } from './store'
import { useMediaQuery } from './hooks/useMediaQuery'
import type { View } from './types'
import Barracks from './views/Barracks/Barracks'
import MissionBoard from './views/MissionBoard/MissionBoard'
import Settings from './views/Settings/Settings'
import DiceTray from './views/DiceTray/DiceTray'
import Login from './views/Auth/Login'
import Setup from './views/Auth/Setup'
import HQ from './views/HQ/HQ'
import Armoury from './views/Armoury/Armoury'
import MissionBuilder from './views/MissionBuilder/MissionBuilder'

const VIEW_COMPONENTS: Record<View, ComponentType> = {
  hq:       HQ,
  barracks: Barracks,
  armoury:  Armoury,
  mission:  MissionBoard,
  settings: Settings,
  builder:  MissionBuilder,
}

const CAMPAIGN_SUB_VIEWS: View[] = ['hq', 'barracks', 'armoury', 'mission', 'builder']

const MOBILE_NAV: { id: View; label: string; glyph: string }[] = [
  { id: 'hq',       label: 'HQ',      glyph: '⌂' },
  { id: 'barracks', label: 'Barracks', glyph: '⊞' },
  { id: 'armoury',  label: 'Armoury',  glyph: '⚔' },
  { id: 'mission',  label: 'Mission',  glyph: '◈' },
]

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-accent text-bg flex items-center justify-center font-bold text-[12px]">
          DC
        </div>
        <div className="text-[13px] text-muted">Loading…</div>
      </div>
    </div>
  )
}

function NoCampaignState() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="bg-surface border border-border p-6 text-center max-w-xs">
        <div className="text-[10px] uppercase tracking-widest text-muted mb-2">No Campaign Selected</div>
        <div className="text-[12px] text-muted">Select a campaign to continue.</div>
      </div>
    </div>
  )
}

export default function App() {
  const authStatus        = useStore(s => s.authStatus)
  const bootstrap         = useStore(s => s.bootstrap)
  const view              = useStore(s => s.currentView)
  const setView           = useStore(s => s.setView)
  const diceOpen          = useStore(s => s.diceTrayOpen)
  const setDice           = useStore(s => s.setDiceTrayOpen)
  const allTroopers       = useStore(s => s.troopers)
  const mission           = useStore(s => s.mission)
  const campaigns         = useStore(s => s.campaigns)
  const currentCampaignId = useStore(s => s.currentCampaignId)
  const createCampaign    = useStore(s => s.createCampaign)
  const selectCampaign    = useStore(s => s.selectCampaign)
  const isDesktop         = useMediaQuery('(min-width: 768px)')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [campaignLoading, setCampaignLoading] = useState(false)

  useEffect(() => {
    bootstrap().catch(() => {})
  }, [])

  // Auth gate
  if (authStatus === 'loading') return <ToastProvider><LoadingScreen /></ToastProvider>
  if (authStatus === 'setup_required') return <ToastProvider><Setup /></ToastProvider>
  if (authStatus === 'unauthenticated') return <ToastProvider><Login /></ToastProvider>

  const activeTrooperCount = allTroopers.filter(t => t.squadId != null).length
  const currentCampaign    = campaigns.find(c => c.id === currentCampaignId) ?? null
  const hasLiveMission     = !!currentCampaign?.currentMissionId

  const handleSelectCampaign = async (id: string) => {
    if (id === currentCampaignId) {
      setSheetOpen(false)
      return
    }
    setCampaignLoading(true)
    try {
      await selectCampaign(id)
      setView('hq')
    } finally {
      setCampaignLoading(false)
      setSheetOpen(false)
    }
  }

  const handleNewCampaign = async () => {
    try {
      const camp = await createCampaign('New Campaign')
      await selectCampaign(camp.id)
      setView('hq')
      setSheetOpen(false)
    } catch {
      // ignore — user will retry
    }
  }

  const needsCampaign = CAMPAIGN_SUB_VIEWS.includes(view) && !currentCampaignId
  const CurrentView   = VIEW_COMPONENTS[view]

  return (
    <ToastProvider>
      <div className="overflow-hidden bg-bg text-ink flex" style={{ height: '100dvh' }}>

        {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
        {isDesktop && (
          <aside className="w-48 bg-surface border-r border-border flex flex-col py-4 px-3 flex-shrink-0">
            {/* Brand */}
            <div className="flex items-center gap-2.5 px-1.5 pb-4 mb-2 border-b border-border">
              <div className="w-[26px] h-[26px] rounded-sm bg-accent text-bg flex items-center justify-center font-bold text-[11px] tracking-tight flex-shrink-0">
                DC
              </div>
              <div>
                <div className="text-[13px] font-semibold leading-tight">Danger Close</div>
                <div className="text-[10.5px] text-muted">Play aid</div>
              </div>
            </div>

            {/* New campaign button */}
            <button
              onClick={handleNewCampaign}
              className="flex items-center gap-1.5 px-2 py-1.5 mb-2 text-[12px] text-muted hover:text-ink border border-border hover:border-accent transition-colors w-full text-left"
            >
              <span>+</span> New Campaign
            </button>

            {/* Campaign list */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 min-h-0">
              {campaigns.length === 0 ? (
                <div className="text-[11px] text-subtle px-2 py-3">
                  No campaigns yet. Create one above.
                </div>
              ) : (
                campaigns.map(camp => {
                  const isActive = camp.id === currentCampaignId
                  return (
                    <div key={camp.id}>
                      {/* Campaign row */}
                      <button
                        onClick={() => handleSelectCampaign(camp.id)}
                        disabled={campaignLoading}
                        className={`flex items-center gap-1.5 w-full text-left px-2 py-1.5 text-[12px] transition-colors
                          ${isActive
                            ? 'bg-[color-mix(in_oklch,theme(colors.accent)_10%,transparent)] text-ink font-semibold'
                            : 'text-muted hover:text-ink'
                          }`}
                      >
                        <span className="text-[10px] text-subtle w-3 flex-shrink-0">
                          {isActive ? '▼' : '▶'}
                        </span>
                        <span className="flex-1 truncate">{camp.name}</span>
                      </button>

                      {/* Sub-items for active campaign */}
                      {isActive && (
                        <div className="flex flex-col gap-0.5 pl-4 mt-0.5 mb-1">
                          <SidebarSubItem
                            label="HQ"
                            viewId="hq"
                            currentView={view}
                            onClick={() => setView('hq')}
                          />
                          <SidebarSubItem
                            label="Barracks"
                            viewId="barracks"
                            currentView={view}
                            onClick={() => setView('barracks')}
                            badge={String(activeTrooperCount)}
                          />
                          <SidebarSubItem
                            label="Armoury"
                            viewId="armoury"
                            currentView={view}
                            onClick={() => setView('armoury')}
                          />
                          {hasLiveMission && (
                            <SidebarSubItem
                              label="Mission"
                              viewId="mission"
                              currentView={view}
                              onClick={() => setView('mission')}
                              live
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Settings pinned to bottom */}
            <div className="flex-shrink-0 border-t border-border pt-2 mt-2">
              <button
                onClick={() => setView('settings')}
                className={`flex items-center gap-2 px-2.5 py-2 w-full text-left text-[12px] rounded-sm
                  ${view === 'settings'
                    ? 'bg-[color-mix(in_oklch,theme(colors.accent)_14%,transparent)] text-accent font-semibold'
                    : 'text-muted hover:text-ink'
                  }`}
              >
                ⚙ Settings
              </button>
            </div>
          </aside>
        )}

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col">

          {/* ── Mobile header ─────────────────────────────────────────────── */}
          {!isDesktop && (
            <header className="flex items-center justify-between bg-surface border-b border-border px-3 py-2 flex-shrink-0">
              {/* Campaign switcher pill */}
              <button
                onClick={() => setSheetOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 border border-border text-[12px] text-ink hover:border-accent transition-colors max-w-[55%] truncate"
              >
                <span className="truncate">
                  {currentCampaign ? currentCampaign.name : 'Select Campaign'}
                </span>
                <span className="text-muted flex-shrink-0">▾</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Settings gear */}
                <button
                  onClick={() => setView('settings')}
                  className={`px-2 py-1 text-[14px] border rounded-sm transition-colors
                    ${view === 'settings' ? 'border-accent text-accent' : 'border-border text-muted hover:text-ink'}`}
                >
                  ⚙
                </button>
                {/* Dice button */}
                <button
                  onClick={() => setDice(!diceOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 border text-[12px] font-medium rounded-sm
                    ${diceOpen ? 'border-accent text-accent' : 'border-border text-ink-dim hover:text-ink'}`}
                >
                  ⬡ Dice
                </button>
              </div>
            </header>
          )}

          {/* ── Desktop page header ──────────────────────────────────────── */}
          {isDesktop && (
            <header className="flex items-center justify-between bg-bg border-b border-border px-5 py-2.5 flex-shrink-0">
              <div>
                <div className="text-[15px] font-bold leading-tight">
                  {view === 'hq'       && 'HQ'}
                  {view === 'barracks' && 'Barracks'}
                  {view === 'armoury'  && 'Armoury'}
                  {view === 'mission'  && 'Mission'}
                  {view === 'settings' && 'Settings'}
                  {view === 'builder'  && 'Mission Builder'}
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  {view === 'barracks' && `${activeTrooperCount} troopers`}
                  {view === 'mission'  && (mission ? mission.name : 'No active mission')}
                  {view === 'hq'       && (currentCampaign ? currentCampaign.name : '')}
                </div>
              </div>
              <button
                onClick={() => setDice(!diceOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border text-[12px] font-medium
                  ${diceOpen ? 'border-accent text-accent' : 'border-border text-ink-dim hover:text-ink'}`}
              >
                ⬡ Dice
              </button>
            </header>
          )}

          {/* ── View ─────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-auto">
            {needsCampaign ? <NoCampaignState /> : <CurrentView />}
          </div>

          {/* ── Mobile bottom nav ────────────────────────────────────────── */}
          {!isDesktop && (
            <nav className="flex bg-surface border-t border-border flex-shrink-0">
              {MOBILE_NAV.filter(n => n.id !== 'mission' || hasLiveMission).map(n => {
                const isActive = view === n.id
                return (
                  <button
                    key={n.id}
                    onClick={() => setView(n.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2
                      ${isActive ? 'text-accent font-semibold' : 'text-muted font-medium'}`}
                  >
                    <span className="text-lg leading-none">{n.glyph}</span>
                    <span className="text-[10.5px]">{n.label}</span>
                  </button>
                )
              })}
            </nav>
          )}
        </main>

        {/* ── Dice tray modal ──────────────────────────────────────────────── */}
        {diceOpen && <DiceTray />}

        {/* ── Mobile campaign bottom sheet ─────────────────────────────────── */}
        {!isDesktop && (
          <>
            {/* Overlay */}
            <div
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 z-40 bg-black/50"
              style={{
                opacity: sheetOpen ? 1 : 0,
                pointerEvents: sheetOpen ? 'auto' : 'none',
                transition: 'opacity 200ms ease',
              }}
            />

            {/* Sheet panel */}
            <div
              className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border overflow-y-auto"
              style={{
                maxHeight: '70vh',
                transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 250ms ease',
              }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="text-[10px] uppercase tracking-widest text-muted">Campaigns</div>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="text-muted hover:text-ink text-[16px] leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col">
                {campaigns.length === 0 ? (
                  <div className="px-4 py-6 text-[12px] text-muted text-center">
                    No campaigns yet.
                  </div>
                ) : (
                  campaigns.map(camp => (
                    <button
                      key={camp.id}
                      onClick={() => handleSelectCampaign(camp.id)}
                      disabled={campaignLoading}
                      className={`flex items-center justify-between px-4 py-3 border-b border-border text-[13px] text-left
                        ${camp.id === currentCampaignId ? 'text-accent font-semibold' : 'text-ink hover:bg-bg'}`}
                    >
                      <span>{camp.name}</span>
                      {camp.id === currentCampaignId && (
                        <span className="text-[10px] text-accent">✓</span>
                      )}
                    </button>
                  ))
                )}

                <button
                  onClick={handleNewCampaign}
                  className="flex items-center gap-2 px-4 py-3 text-[12px] text-muted hover:text-ink border-b border-border"
                >
                  + New Campaign
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </ToastProvider>
  )
}

// ── Sidebar sub-item ──────────────────────────────────────────────────────────

function SidebarSubItem({
  label,
  viewId,
  currentView,
  onClick,
  badge,
  live,
}: {
  label: string
  viewId: View
  currentView: View
  onClick: () => void
  badge?: string
  live?: boolean
}) {
  const isActive = currentView === viewId
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 w-full text-left px-2 py-1.5 text-[12px] transition-colors rounded-sm
        ${isActive
          ? 'bg-[color-mix(in_oklch,theme(colors.accent)_14%,transparent)] text-accent font-semibold'
          : 'text-muted hover:text-ink'
        }`}
    >
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="text-[11px] text-subtle font-mono">{badge}</span>
      )}
      {live && (
        <span className="text-[9px] font-bold tracking-wide bg-accent text-bg px-1.5 py-0.5 rounded-xs">
          LIVE
        </span>
      )}
    </button>
  )
}

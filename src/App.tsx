import { type ComponentType } from 'react'
import { ToastProvider } from './components'
import { useStore } from './store'
import { useMediaQuery } from './hooks/useMediaQuery'
import type { View } from './types'
import Barracks from './views/Barracks/Barracks'
import MissionBoard from './views/MissionBoard/MissionBoard'
import Settings from './views/Settings/Settings'
import DiceTray from './views/DiceTray/DiceTray'

const NAV = [
  { id: 'barracks', label: 'Barracks', glyph: '⊞' },
  { id: 'mission',  label: 'Mission',  glyph: '◈' },
  { id: 'dice',     label: 'Dice',     glyph: '⬡' },
  { id: 'settings', label: 'Settings', glyph: '⚙' },
] as const

type NavId = typeof NAV[number]['id']

const VIEW_COMPONENTS: Record<Exclude<View, 'dice'>, ComponentType> = {
  barracks: Barracks,
  mission:  MissionBoard,
  settings: Settings,
}

export default function App() {
  const view        = useStore(s => s.currentView)
  const setView     = useStore(s => s.setView)
  const diceOpen    = useStore(s => s.diceTrayOpen)
  const setDice     = useStore(s => s.setDiceTrayOpen)
  const allTroopers = useStore(s => s.troopers)
  const mission     = useStore(s => s.mission)
  const isDesktop   = useMediaQuery('(min-width: 768px)')

  const activeTrooperCount = allTroopers.filter(t => t.active).length

  const handleNav = (id: NavId) => {
    if (id === 'dice') { setDice(!diceOpen); return }
    setView(id as View)
  }

  const pageTitle = () => {
    if (view === 'barracks') return { title: 'Barracks', sub: `${activeTrooperCount} troopers` }
    if (view === 'mission')  return { title: 'Mission', sub: mission ? mission.name : 'No active mission' }
    return { title: 'Settings', sub: null }
  }
  const { title, sub } = pageTitle()
  const CurrentView = VIEW_COMPONENTS[view as Exclude<View, 'dice'>] ?? Barracks

  return (
    <ToastProvider>
      <div className="overflow-hidden bg-bg text-ink flex" style={{ height: '100dvh' }}>

        {/* Desktop sidebar */}
        {isDesktop && (
          <aside className="w-40 bg-surface border-r border-border flex flex-col py-4 px-3 flex-shrink-0">
            {/* Brand */}
            <div className="flex items-center gap-2.5 px-1.5 pb-4 mb-2 border-b border-border">
              <div className="w-[26px] h-[26px] rounded-md bg-accent text-bg flex items-center justify-center font-bold text-[11px] tracking-tight flex-shrink-0">
                DC
              </div>
              <div>
                <div className="text-[13px] font-semibold leading-tight">Danger Close</div>
                <div className="text-[10.5px] text-muted">Play aid</div>
              </div>
            </div>

            {/* Nav */}
            {NAV.map(n => {
              const isActive = n.id === 'dice' ? diceOpen : view === n.id
              return (
                <button key={n.id} onClick={() => handleNav(n.id)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-0.5 text-[13px] w-full text-left
                    ${isActive
                      ? 'bg-[color-mix(in_oklch,theme(colors.accent)_14%,transparent)] text-accent font-semibold'
                      : 'text-ink-dim font-medium hover:bg-surface2'
                    }`}>
                  <span className="text-base leading-none w-4 text-center">{n.glyph}</span>
                  <span className="flex-1">{n.label}</span>
                  {n.id === 'barracks' && (
                    <span className="text-[11px] text-subtle font-mono">{activeTrooperCount}</span>
                  )}
                  {n.id === 'mission' && mission && (
                    <span className="text-[9px] font-bold tracking-wide bg-accent text-bg px-1.5 py-0.5 rounded-xs">
                      LIVE
                    </span>
                  )}
                </button>
              )
            })}
          </aside>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <header className="flex items-center justify-between bg-bg border-b border-border px-5 py-2.5 flex-shrink-0">
            <div>
              <div className="text-[15px] font-bold leading-tight">{title}</div>
              {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
            </div>
            <button onClick={() => setDice(!diceOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[12px] font-medium
                ${diceOpen ? 'border-accent text-accent' : 'border-border text-ink-dim hover:text-ink'}`}>
              ⬡ Dice
            </button>
          </header>

          <div className="flex-1 overflow-auto">
            <CurrentView />
          </div>

          {/* Mobile bottom nav */}
          {!isDesktop && (
            <nav className="flex bg-surface border-t border-border">
              {NAV.map(n => {
                const isActive = n.id === 'dice' ? diceOpen : view === n.id
                return (
                  <button key={n.id} onClick={() => handleNav(n.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2
                      ${isActive ? 'text-accent font-semibold' : 'text-muted font-medium'}`}>
                    <span className="text-lg leading-none">{n.glyph}</span>
                    <span className="text-[10.5px]">{n.label}</span>
                  </button>
                )
              })}
            </nav>
          )}
        </main>

        {diceOpen && <DiceTray />}
      </div>
    </ToastProvider>
  )
}

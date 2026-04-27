import { type ComponentType } from 'react'
import { useStore } from './store'
import { useMediaQuery } from './hooks/useMediaQuery'
import type { View } from './types'
import Barracks from './views/Barracks/Barracks'
import MissionBoard from './views/MissionBoard/MissionBoard'
import Settings from './views/Settings/Settings'
import DiceTray from './views/DiceTray/DiceTray'

const NAV = [
  { id: 'barracks', label: 'BKS', glyph: '⊞', title: 'Barracks' },
  { id: 'mission', label: 'MSN', glyph: '◈', title: 'Mission' },
  { id: 'settings', label: 'SET', glyph: '⚙', title: 'Settings' },
] as const

export default function App() {
  const view = useStore(s => s.currentView)
  const setView = useStore(s => s.setView)
  const diceOpen = useStore(s => s.diceTrayOpen)
  const setDice = useStore(s => s.setDiceTrayOpen)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const VIEW_COMPONENTS: Record<View, ComponentType> = {
    barracks: Barracks,
    mission: MissionBoard,
    settings: Settings,
  }
  const CurrentView = VIEW_COMPONENTS[view]

  return (
    <div className="h-screen overflow-hidden bg-bg text-ink flex" style={{ height: '100dvh' }}>
      {isDesktop && (
        <aside className="w-14 bg-surface border-r border-border flex flex-col items-stretch py-3 flex-shrink-0">
          <div className="text-ok text-center text-[10px] tracking-[0.1em] pb-2 mb-4 border-b border-border">DC</div>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`py-2 text-center border-l-2 ${view === n.id ? 'border-ok text-ok' : 'border-transparent text-muted'} hover:text-ink`}>
              <div className="text-base leading-none">{n.glyph}</div>
              <div className="text-[9px] mt-1">{n.label}</div>
            </button>
          ))}
        </aside>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between bg-surface border-b border-border px-4 py-3 flex-shrink-0">
          <div className="lbl">{NAV.find(n => n.id === view)?.title.toUpperCase()}</div>
          <button onClick={() => setDice(!diceOpen)} className={`text-lg leading-none ${diceOpen ? 'text-ok' : 'text-warn'}`}>⬡</button>
        </header>
        <div className="flex-1 overflow-auto">
          <CurrentView />
        </div>
        {!isDesktop && (
          <nav className="flex bg-surface border-t border-border">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setView(n.id)}
                className={`flex-1 py-2 text-center ${view === n.id ? 'text-ok' : 'text-muted'}`}>
                <div className="text-base leading-none">{n.glyph}</div>
                <div className="text-[9px] mt-1">{n.label}</div>
              </button>
            ))}
          </nav>
        )}
      </main>

      {diceOpen && <DiceTray />}
    </div>
  )
}

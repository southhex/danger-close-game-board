import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import TrooperMissionCard from './TrooperMissionCard'
import TrooperDetailPanel from './TrooperDetailPanel'

export default function TrooperCardDock() {
  const allTroopers = useStore(s => s.troopers)
  const troopers = useMemo(() => allTroopers.filter(t => t.active), [allTroopers])
  const mission = useStore(s => s.mission)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (!mission) return null

  const activeSector = mission.sectors.find(s => s.id === mission.activeSectorId) ?? mission.sectors[0]
  const selectedTrooper = selectedId ? troopers.find(t => t.id === selectedId) ?? null : null

  const handleExpand = (id: string) => {
    setSelectedId(prev => (prev === id ? null : id))
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 z-20 pointer-events-none">
      {/* Gradient fade behind cards */}
      <div aria-hidden className="absolute -top-10 left-0 right-0 h-10"
        style={{ background: 'linear-gradient(to top, #0e1210, transparent)' }} />
      <div className="relative pointer-events-auto"
        style={{ boxShadow: '0 -4px 12px rgba(0,0,0,0.5)' }}>
        <div className="bg-surface border-t border-border">
          <div className="flex">
            {/* Card strip */}
            <div className="flex-1 min-w-0 px-3 pt-2 pb-1">
              <div className="lbl text-[9px] mb-1">TROOPERS</div>
              <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2">
                {troopers.length === 0 && (
                  <div className="text-[10px] text-muted italic">No active troopers. Activate troopers in the Barracks.</div>
                )}
                {troopers.map(t => (
                  <TrooperMissionCard
                    key={t.id}
                    trooper={t}
                    squad={troopers}
                    cover={activeSector.cover}
                    space={activeSector.space}
                    onExpand={handleExpand}
                    expanded={t.id === selectedId}
                  />
                ))}
              </div>
            </div>

            {/* Detail panel (desktop inline, mobile full-screen via panel's own fixed positioning) */}
            {selectedTrooper && (
              <TrooperDetailPanel
                trooper={selectedTrooper}
                onClose={() => setSelectedId(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

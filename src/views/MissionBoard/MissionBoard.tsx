import { useStore } from '../../store'
import SectorMomentumPanel from './SectorMomentumPanel'
import MissionNotes from './MissionNotes'
import TrooperCardDock from './TrooperCardDock'

export default function MissionBoard() {
  const mission = useStore(s => s.mission)
  const prepareMission = useStore(s => s.prepareMission)

  if (!mission) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3">
        <div className="lbl">NO ACTIVE MISSION</div>
        <div className="text-[11px] text-muted">Initialise a mission from the Barracks (Prepare for Mission) or start a blank one now.</div>
        <button onClick={prepareMission} className="text-[11px] text-warn border border-warn px-3 py-1">START MISSION</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-3 flex flex-col gap-3 pb-[260px]">
        {/* AdvanceRollPanel slot — Task 9 */}
        <div className="bg-surface border border-border p-3 lbl">ADVANCE ROLL (wip)</div>
        <SectorMomentumPanel />
        <MissionNotes />
      </div>
      <TrooperCardDock />
    </div>
  )
}

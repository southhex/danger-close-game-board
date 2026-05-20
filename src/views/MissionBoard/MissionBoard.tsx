import { useState } from 'react'
import { useStore } from '../../store'
import { ConfirmDialog } from '../../components'
import SectorMomentumPanel from './SectorMomentumPanel'
import MissionNotes from './MissionNotes'
import TrooperCardDock from './TrooperCardDock'
import AdvanceRollPanel from './AdvanceRollPanel'
import SectorChainStrip from './SectorChainStrip'
import EngagementPanel from './EngagementPanel'
import CatchBreathPanel from './CatchBreathPanel'
import MissionCompletePanel from './MissionCompletePanel'
import DetermineSectorPanel from './DetermineSectorPanel'

export default function MissionBoard() {
  const mission = useStore(s => s.mission)
  const discardMission = useStore(s => s.discardMission)
  const [discardOpen, setDiscardOpen] = useState(false)

  if (!mission) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3">
        <div className="lbl">NO ACTIVE MISSION</div>
        <div className="text-[11px] text-muted">Deploy a squad from HQ to begin a mission.</div>
        <button disabled className="text-[11px] text-muted border border-border px-3 py-1 opacity-40 cursor-not-allowed">START MISSION</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="p-3 flex flex-col gap-3 pb-12">
          <SectorChainStrip />

          {/* Discard — always available */}
          <div className="flex justify-end">
            <button
              onClick={() => setDiscardOpen(true)}
              className="text-[9px] text-muted border border-border px-2 py-0.5 hover:text-bad hover:border-bad"
            >
              DISCARD MISSION
            </button>
          </div>

          {mission.phase !== 'mission_complete' && <SectorMomentumPanel />}

          {mission.phase === 'determine_sector' && <DetermineSectorPanel />}
          {mission.phase === 'advance' && <AdvanceRollPanel />}
          {mission.phase === 'engagement' && <EngagementPanel />}
          {mission.phase === 'catch_breath' && <CatchBreathPanel />}
          {mission.phase === 'mission_complete' && <MissionCompletePanel />}

          <MissionNotes />
        </div>
      </div>
      <TrooperCardDock />

      <ConfirmDialog
        open={discardOpen}
        title="DISCARD MISSION"
        message="Abort and archive this mission. No REQ will be awarded. This cannot be undone."
        confirmLabel="DISCARD"
        onConfirm={() => { setDiscardOpen(false); void discardMission() }}
        onCancel={() => setDiscardOpen(false)}
        tone="danger"
      />
    </div>
  )
}

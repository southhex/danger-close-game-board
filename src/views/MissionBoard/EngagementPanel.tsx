import { useStore } from '../../store'
import HardTargetPanel from './HardTargetPanel'
import SectorHeader from './SectorHeader'
import AttachedForcePanel from './AttachedForcePanel'
import IntentStep from './IntentStep'
import OffenseStep from './OffenseStep'
import DefenseStep from './DefenseStep'
import MomentumStep from './MomentumStep'
import EnemyTacticsStep from './EnemyTacticsStep'
import { isDeployed } from '../../utils/gameRules'
import type { EngagementState } from '../../types'

const STEPS: EngagementState['step'][] = ['intent', 'offense', 'defense', 'momentum', 'enemy_tactics']
const STEP_LABEL: Record<EngagementState['step'], string> = {
  intent: 'INTENT',
  offense: 'OFFENSE',
  defense: 'DEFENSE',
  momentum: 'MOMENTUM',
  enemy_tactics: 'TACTICS',
}

function momentumColor(m: number): string {
  if (m > 0) return 'text-ok'
  if (m < 0) return 'text-bad'
  return 'text-muted'
}

function momentumDisplay(m: number): string {
  if (m > 0) return `+${m}`
  return String(m)
}

export default function EngagementPanel() {
  const mission = useStore(s => s.mission)
  const allTroopers = useStore(s => s.troopers)
  const endEngagement = useStore(s => s.endEngagement)
  const updatePressure = useStore(s => s.updatePressure)
  const addRoll = useStore(s => s.addRoll)

  if (!mission || !mission.engagement) return null

  const eng = mission.engagement
  const activeSector = mission.sectors.find(s => s.id === mission.activeSectorId) ?? mission.sectors[0]
  const pressureCap = activeSector.tl + 1
  const activeTroopers = allTroopers.filter(t => isDeployed(t, mission) && t.status !== 'dead')

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="bg-surface border border-border p-3">
        {/* Exchange + step strip row */}
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <div className="lbl text-[10px]">
            EXCHANGE <span className="text-ink text-[13px]">{eng.exchangeNumber}</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {STEPS.map(step => (
              <span
                key={step}
                className={`text-[9px] px-1 border ${
                  eng.step === step ? 'border-warn text-warn' : 'border-border text-muted'
                }`}
              >
                {STEP_LABEL[step]}
              </span>
            ))}
          </div>
        </div>

        {/* Sector notation + momentum + pressure row */}
        <div className="flex items-center gap-4 flex-wrap">
          <SectorHeader sector={activeSector} />

          <div className="flex items-center gap-1">
            <span className="lbl text-[9px]">MOMENTUM:</span>
            <span className={`text-[11px] font-bold ${momentumColor(mission.momentum)}`}>
              {momentumDisplay(mission.momentum)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="lbl text-[9px]">PRESSURE:</span>
            <button
              onClick={() => updatePressure(-1)}
              className="text-muted text-[10px] leading-none px-0.5"
            >◀</button>
            <span className={`text-[11px] font-bold ${eng.pressure > 0 ? 'text-bad' : 'text-muted'}`}>
              {eng.pressure}/{pressureCap}
            </span>
            <button
              onClick={() => updatePressure(1)}
              className="text-muted text-[10px] leading-none px-0.5"
            >▶</button>
          </div>
        </div>
      </div>

      {/* Hard Targets */}
      <HardTargetPanel hardTargets={eng.hardTargets} />

      {/* Attached Forces */}
      <AttachedForcePanel forces={eng.attachedForces} />

      {/* Active step sub-component */}
      <div>
        {eng.step === 'intent' && (
          <IntentStep
            engagement={eng}
            troopers={activeTroopers}
            sector={activeSector}
            hardTargets={eng.hardTargets}
          />
        )}
        {eng.step === 'offense' && (
          <OffenseStep engagement={eng} troopers={activeTroopers} sector={activeSector} addRoll={addRoll} />
        )}
        {eng.step === 'defense' && (
          <DefenseStep engagement={eng} troopers={activeTroopers} sector={activeSector} addRoll={addRoll} />
        )}
        {eng.step === 'momentum' && (
          <MomentumStep engagement={eng} troopers={activeTroopers} sector={activeSector} />
        )}
        {eng.step === 'enemy_tactics' && (
          <EnemyTacticsStep engagement={eng} troopers={activeTroopers} sector={activeSector} addRoll={addRoll} />
        )}
      </div>

      {/* End engagement controls */}
      <div className="bg-surface border border-border p-3 flex gap-2 flex-wrap">
        <div className="lbl text-[9px] self-center mr-1">ENGAGEMENT:</div>
        {mission.momentum === 3 && (
          <button
            onClick={() => endEngagement('victory')}
            className="text-[10px] text-ok border border-ok px-2 py-0.5"
          >
            VICTORY
          </button>
        )}
        {mission.momentum === -3 && (
          <button
            onClick={() => endEngagement('defeat')}
            className="text-[10px] text-bad border border-bad px-2 py-0.5"
          >
            DEFEAT
          </button>
        )}
        <button
          onClick={() => endEngagement('disengage')}
          className="text-[10px] text-muted border border-border px-2 py-0.5 hover:text-ink"
        >
          DISENGAGE
        </button>
      </div>
    </div>
  )
}

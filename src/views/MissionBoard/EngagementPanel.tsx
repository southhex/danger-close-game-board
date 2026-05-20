import { useRef, useEffect } from 'react'
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
  const setExchangeStep = useStore(s => s.setExchangeStep)
  const addRoll = useStore(s => s.addRoll)

  const panelRef = useRef<HTMLDivElement>(null)

  const eng = mission?.engagement

  // Scroll engagement panel into view at the top whenever the step changes
  useEffect(() => {
    if (!eng) return
    panelRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [eng?.step])

  if (!mission || !eng) return null
  const activeSector = mission.sectors.find(s => s.id === mission.activeSectorId) ?? mission.sectors[0]
  const pressureCap = activeSector.tl + 1
  const activeTroopers = allTroopers.filter(t => isDeployed(t, mission) && t.status !== 'dead')

  // Step strip — which steps have produced data and can be navigated back to
  const nonBO = activeTroopers.filter(t => t.status !== 'bleedingout')
  const intentPassed = Object.keys(eng.intents).length > 0
  const offensePassed = eng.offenseResult !== undefined
  const defensePassed = nonBO.length > 0 && nonBO.every(t => eng.defenseResults[t.id] !== undefined)
  const momentumPassed = eng.step === 'enemy_tactics'
  const stepPassed: Record<EngagementState['step'], boolean> = {
    intent: intentPassed,
    offense: offensePassed,
    defense: defensePassed,
    momentum: momentumPassed,
    enemy_tactics: false,
  }

  return (
    <div ref={panelRef} className="flex flex-col gap-3">
      {/* Header — sticky so it stays visible during long sub-step scroll */}
      <div className="bg-surface border border-border p-3 sticky top-0 z-10">
        {/* Exchange + step strip row */}
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <div className="lbl text-[10px]">
            EXCHANGE <span className="text-ink text-[13px]">{eng.exchangeNumber}</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {STEPS.map(step => {
              const isCurrent = eng.step === step
              const isPassed = stepPassed[step]
              const isClickable = !isCurrent && isPassed
              const cls = isCurrent
                ? 'border-warn text-warn'
                : isPassed
                  ? 'border-ok/40 text-ok/70 hover:text-ok hover:border-ok cursor-pointer'
                  : 'border-border text-muted opacity-50'
              return (
                <button
                  key={step}
                  onClick={() => { if (isClickable) setExchangeStep(step) }}
                  disabled={!isClickable}
                  className={`text-[9px] px-1 border ${cls}`}
                  title={isClickable ? 'Go back to this step' : isCurrent ? 'Current step' : 'Not yet reached'}
                >
                  {STEP_LABEL[step]}
                </button>
              )
            })}
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

          <div className="flex items-center gap-1.5">
            <span className="lbl text-[9px]">PRESSURE:</span>
            <button
              onClick={() => updatePressure(-1)}
              className="text-muted text-[10px] leading-none px-0.5"
              aria-label="Decrease pressure"
            >◀</button>
            <div className="flex items-center gap-0.5" aria-label={`Pressure ${eng.pressure} of ${pressureCap}`}>
              {Array.from({ length: pressureCap }, (_, i) => {
                const filled = i < eng.pressure
                const atCap = eng.pressure >= pressureCap
                const fillClass = filled
                  ? (atCap ? 'bg-bad border-bad' : 'bg-warn border-warn')
                  : 'bg-transparent border-border'
                return <span key={i} className={`w-2 h-2.5 border ${fillClass}`} />
              })}
            </div>
            <span className={`text-[10px] font-bold ${eng.pressure >= pressureCap ? 'text-bad' : eng.pressure > 0 ? 'text-warn' : 'text-muted'}`}>
              {eng.pressure}/{pressureCap}
            </span>
            <button
              onClick={() => updatePressure(1)}
              className="text-muted text-[10px] leading-none px-0.5"
              aria-label="Increase pressure"
            >▶</button>
          </div>
        </div>
      </div>

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

      {/* Hard Targets */}
      <HardTargetPanel hardTargets={eng.hardTargets} />

      {/* Attached Forces */}
      <AttachedForcePanel forces={eng.attachedForces} />

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

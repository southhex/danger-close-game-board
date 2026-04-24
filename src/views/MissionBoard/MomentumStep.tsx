import { useState } from 'react'
import { useStore } from '../../store'
import type { EngagementState, Trooper, MissionSector } from '../../types'

interface Props {
  engagement: EngagementState
  troopers: Trooper[]
  sector: MissionSector
}

export default function MomentumStep({ engagement, troopers }: Props) {
  const setExchangeStep = useStore(s => s.setExchangeStep)
  const updateTrooper = useStore(s => s.updateTrooper)
  const updateEngagement = useStore(s => s.updateEngagement)

  // Track which troopers have had their momentum choice made
  const [resolved, setResolved] = useState<Set<string>>(new Set())

  const delta = engagement.offenseResult?.momentumDelta ?? 0

  const flankingTroopers = troopers.filter(t => t.offpos === 'flanking')
  const fortifiedTroopers = troopers.filter(t => t.defpos === 'fortified')
  const flankedTroopers = troopers.filter(t => t.defpos === 'flanked')

  const requiresChoices =
    (delta > 0 && (flankingTroopers.length > 0 || fortifiedTroopers.length > 0)) ||
    (delta < 0 && flankedTroopers.length > 0)

  function markResolved(id: string) {
    setResolved(prev => new Set([...prev, id]))
  }

  function handleStayFlanking(trooper: Trooper) {
    updateEngagement({
      nextExchangeModifiers: {
        ...engagement.nextExchangeModifiers,
        flankingDefPenalty: [...engagement.nextExchangeModifiers.flankingDefPenalty, trooper.id],
      },
    })
    markResolved(trooper.id + '_flanking')
  }

  function handleFallBackToEngaged(trooper: Trooper) {
    updateTrooper(trooper.id, { offpos: 'engaged' })
    markResolved(trooper.id + '_flanking')
  }

  function handleBecomeLimited(trooper: Trooper) {
    updateTrooper(trooper.id, { offpos: 'limited' })
    markResolved(trooper.id + '_fortified')
  }

  function handleEngagedInCover(trooper: Trooper) {
    updateTrooper(trooper.id, { offpos: 'engaged', defpos: 'incover' })
    markResolved(trooper.id + '_fortified')
  }

  function handleFlagMustFallBack(trooper: Trooper) {
    updateEngagement({
      nextExchangeModifiers: {
        ...engagement.nextExchangeModifiers,
        flankedMustFallBack: [...engagement.nextExchangeModifiers.flankedMustFallBack, trooper.id],
      },
    })
    markResolved(trooper.id + '_flanked')
  }

  function handleAcceptDefPenalty(trooper: Trooper) {
    updateTrooper(trooper.id, { def_modifier: trooper.def_modifier - 1 })
    markResolved(trooper.id + '_flanked')
  }

  return (
    <div className="bg-surface border border-border">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <span className="lbl text-[10px]">EXCHANGE {engagement.exchangeNumber} — MOMENTUM</span>
      </div>

      {/* Delta display */}
      <div className="px-3 py-2 border-b border-border">
        {delta > 0 && (
          <div className="text-ok text-[11px] font-bold">MOMENTUM GAINED (+{delta})</div>
        )}
        {delta < 0 && (
          <div className="text-bad text-[11px] font-bold">MOMENTUM LOST ({delta})</div>
        )}
        {delta === 0 && (
          <div className="text-neutral text-[11px] font-bold">MOMENTUM HOLD</div>
        )}
      </div>

      {/* On GAIN: flanking and fortified choices */}
      {delta > 0 && requiresChoices && (
        <div className="divide-y divide-border">
          {flankingTroopers.map(trooper => {
            const key = trooper.id + '_flanking'
            const done = resolved.has(key)
            return (
              <div key={trooper.id} className={`px-3 py-3 flex flex-col gap-2 ${done ? 'opacity-60' : ''}`}>
                <div className="text-ink text-[10px] font-bold">{trooper.name} — FLANKING</div>
                {!done && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleStayFlanking(trooper)}
                      className="text-[10px] px-2 py-0.5 border border-warn text-warn hover:bg-warn/10"
                    >
                      STAY FLANKING (−1 DEF NEXT EXCHANGE)
                    </button>
                    <button
                      onClick={() => handleFallBackToEngaged(trooper)}
                      className="text-[10px] px-2 py-0.5 border border-border text-muted hover:text-ink"
                    >
                      FALL BACK TO ENGAGED
                    </button>
                  </div>
                )}
                {done && <div className="text-[9px] text-ok">CHOICE MADE</div>}
              </div>
            )
          })}

          {fortifiedTroopers.map(trooper => {
            const key = trooper.id + '_fortified'
            const done = resolved.has(key)
            return (
              <div key={trooper.id} className={`px-3 py-3 flex flex-col gap-2 ${done ? 'opacity-60' : ''}`}>
                <div className="text-ink text-[10px] font-bold">{trooper.name} — FORTIFIED</div>
                {!done && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleBecomeLimited(trooper)}
                      className="text-[10px] px-2 py-0.5 border border-bad text-bad hover:bg-bad/10"
                    >
                      BECOME LIMITED
                    </button>
                    <button
                      onClick={() => handleEngagedInCover(trooper)}
                      className="text-[10px] px-2 py-0.5 border border-neutral text-neutral hover:text-ink"
                    >
                      ENGAGED + IN COVER
                    </button>
                  </div>
                )}
                {done && <div className="text-[9px] text-ok">CHOICE MADE</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* On LOSS: flanked trooper choices */}
      {delta < 0 && flankedTroopers.length > 0 && (
        <div className="divide-y divide-border">
          {flankedTroopers.map(trooper => {
            const key = trooper.id + '_flanked'
            const done = resolved.has(key)
            return (
              <div key={trooper.id} className={`px-3 py-3 flex flex-col gap-2 ${done ? 'opacity-60' : ''}`}>
                <div className="text-ink text-[10px] font-bold">{trooper.name} — FLANKED</div>
                <div className="text-[9px] text-bad">⚠ MUST FALL BACK next exchange OR accept −1 DEF</div>
                {!done && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleFlagMustFallBack(trooper)}
                      className="text-[10px] px-2 py-0.5 border border-warn text-warn hover:bg-warn/10"
                    >
                      FLAG MUST FALL BACK
                    </button>
                    <button
                      onClick={() => handleAcceptDefPenalty(trooper)}
                      className="text-[10px] px-2 py-0.5 border border-bad text-bad hover:bg-bad/10"
                    >
                      ACCEPT −1 DEF NOW
                    </button>
                  </div>
                )}
                {done && <div className="text-[9px] text-ok">CHOICE MADE</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Proceed */}
      <div className="px-3 py-2 border-t border-border">
        <button
          onClick={() => setExchangeStep('enemy_tactics')}
          className="text-[10px] px-4 py-1 border border-warn text-warn hover:bg-warn/10"
        >
          PROCEED TO TACTICS →
        </button>
      </div>
    </div>
  )
}

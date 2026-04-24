import { useState } from 'react'
import { useStore } from '../../store'
import {
  calcDefPool,
  defRollOutcome,
  injuryDiceForTL,
} from '../../utils/gameRules'
import { rollDice } from '../../utils/dice'
import { newId } from '../../utils/id'
import type {
  EngagementState,
  Trooper,
  MissionSector,
  DiceRoll,
  DefenseResult,
} from '../../types'

interface Props {
  engagement: EngagementState
  troopers: Trooper[]
  sector: MissionSector
  addRoll: (roll: DiceRoll) => void
}

function offposLabel(p: Trooper['offpos']): string {
  if (p === 'limited') return 'LTD'
  if (p === 'engaged') return 'ENG'
  return 'FLK'
}

function defposLabel(p: Trooper['defpos']): string {
  if (p === 'flanked') return 'FLKD'
  if (p === 'incover') return 'COV'
  return 'FORT'
}

function offposColor(p: Trooper['offpos']): string {
  if (p === 'flanking') return 'text-ok border-ok'
  if (p === 'limited') return 'text-bad border-bad'
  return 'text-neutral border-neutral'
}

function defposColor(p: Trooper['defpos']): string {
  if (p === 'fortified') return 'text-ok border-ok'
  if (p === 'flanked') return 'text-bad border-bad'
  return 'text-neutral border-neutral'
}

export default function DefenseStep({ engagement, troopers, sector, addRoll }: Props) {
  const resolveDefenseRoll = useStore(s => s.resolveDefenseRoll)
  const setExchangeStep = useStore(s => s.setExchangeStep)
  const updateTrooper = useStore(s => s.updateTrooper)

  // Per-trooper local state
  const [rolledResults, setRolledResults] = useState<Record<string, number>>({})
  const [inputResults, setInputResults] = useState<Record<string, string>>({})
  const [injuryInputs, setInjuryInputs] = useState<Record<string, string>>({})

  // Did offense result come from success_at_cost and momentum was at 2 before applying? (Final Stand)
  const offenseOutcome = engagement.offenseResult?.outcome
  const offenseDelta = engagement.offenseResult?.momentumDelta ?? 0
  // mission momentum AFTER offense already applied = current. Before would be current - delta
  // We detect final stand: offense was success_at_cost and pushing from 2 to 3
  // Since store applies momentum in resolveOffenseRoll, we check: was SaC and current momentum == 3
  // Use mission store momentum directly. We pass engagement which has the offenseResult.
  const mission = useStore(s => s.mission)
  const currentMomentum = mission?.momentum ?? 0
  const isFinalStand = offenseOutcome === 'success_at_cost' && offenseDelta === 1 && currentMomentum === 3

  function getCoveringFireBonus(trooper: Trooper): number {
    let bonus = 0
    for (const t of troopers) {
      if (t.id === trooper.id) continue
      const intent = engagement.intents[t.id]
      if (intent?.action === 'covering_fire' && intent.coveringFireTargets?.includes(trooper.id)) {
        bonus += 1
        // LMG carrier: gives +1 additional (check special_weapon)
        if (t.special_weapon === 'LMG') bonus += 1
      }
    }
    return bonus
  }

  function getActiveResult(trooperId: string): number | null {
    const rolled = rolledResults[trooperId]
    if (rolled !== undefined) return rolled
    const inp = inputResults[trooperId]
    if (inp && inp !== '') return Number(inp)
    return null
  }

  function handleRollInApp(trooper: Trooper) {
    const coverBonus = getCoveringFireBonus(trooper)
    const pool = calcDefPool(trooper, coverBonus, trooper.def_modifier)
    const results = rollDice(pool, 6)
    const highest = Math.max(...results)

    setRolledResults(prev => ({ ...prev, [trooper.id]: highest }))
    setInputResults(prev => ({ ...prev, [trooper.id]: '' }))

    const diceRoll: DiceRoll = {
      id: newId(),
      timestamp: Date.now(),
      label: `Exchange ${engagement.exchangeNumber} — Defense (${trooper.name})`,
      dice: `${pool}d6`,
      results,
      modifier: 0,
      total: highest,
    }
    addRoll(diceRoll)
  }

  function handleResolveSuppressed(trooper: Trooper, roll: number) {
    const result: DefenseResult = {
      roll,
      outcome: 'direct_fire',
      resolution: 'suppressed',
    }
    resolveDefenseRoll(trooper.id, result)
    updateTrooper(trooper.id, { suppressed: true })
  }

  function handleResolveInjury(trooper: Trooper, roll: number) {
    const injuryCount = injuryInputs[trooper.id] ? Number(injuryInputs[trooper.id]) : 1
    const result: DefenseResult = {
      roll,
      outcome: 'direct_fire',
      resolution: 'injury',
      injuryCount,
    }
    resolveDefenseRoll(trooper.id, result)
  }

  function handleResolveSafe(trooper: Trooper, roll: number) {
    const result: DefenseResult = {
      roll,
      outcome: 'safe',
    }
    resolveDefenseRoll(trooper.id, result)
  }

  // All non-bleedingout troopers need a defense result
  const nonBleedingOut = troopers.filter(t => t.status !== 'bleedingout')
  const allResolved = nonBleedingOut.every(t => engagement.defenseResults[t.id] !== undefined)

  return (
    <div className="bg-surface border border-border">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <span className="lbl text-[10px]">EXCHANGE {engagement.exchangeNumber} — DEFENSE ROLLS</span>
        {isFinalStand && (
          <span className="text-[9px] px-1 border border-bad text-bad">FINAL STAND</span>
        )}
      </div>

      {/* Per-trooper cards */}
      <div className="divide-y divide-border">
        {troopers.map(trooper => {
          const coverBonus = getCoveringFireBonus(trooper)
          const pool = calcDefPool(trooper, coverBonus, trooper.def_modifier)
          const activeResult = getActiveResult(trooper.id)
          const outcome = activeResult !== null ? defRollOutcome(activeResult, trooper.defpos) : null
          const resolvedResult = engagement.defenseResults[trooper.id]
          const isResolved = resolvedResult !== undefined
          const isAlreadySuppressed = trooper.suppressed

          if (trooper.status === 'bleedingout') {
            return (
              <div key={trooper.id} className="px-3 py-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-bad text-[11px] font-bold">{trooper.name}</span>
                  <span className="text-[9px] px-1 border border-bad text-bad">BLEEDING OUT</span>
                </div>
                <div className="text-[10px] text-bad">
                  BLEEDING OUT — dies next exchange if not stabilised
                </div>
              </div>
            )
          }

          return (
            <div key={trooper.id} className={`px-3 py-3 flex flex-col gap-2 ${isResolved ? 'opacity-60' : ''}`}>
              {/* Name + badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-ink text-[11px] font-bold">{trooper.name}</span>
                <span className={`text-[9px] px-1 border ${offposColor(trooper.offpos)}`}>
                  {offposLabel(trooper.offpos)}
                </span>
                <span className={`text-[9px] px-1 border ${defposColor(trooper.defpos)}`}>
                  {defposLabel(trooper.defpos)}
                </span>
                {trooper.suppressed && (
                  <span className="text-[9px] px-1 border border-bad text-bad">SUPPRESSED</span>
                )}
                {isResolved && (
                  <span className="text-[9px] px-1 border border-ok text-ok">RESOLVED</span>
                )}
              </div>

              {/* DEF pool info */}
              <div className="text-[10px] text-muted">
                DEF POOL: <span className="text-ink">{pool}D6 — take highest</span>
                {coverBonus > 0 && (
                  <span className="text-ok"> (+{coverBonus} covering fire)</span>
                )}
                {trooper.def_modifier !== 0 && (
                  <span className={trooper.def_modifier > 0 ? 'text-ok' : 'text-bad'}>
                    {' '}({trooper.def_modifier > 0 ? '+' : ''}{trooper.def_modifier} modifier)
                  </span>
                )}
              </div>

              {!isResolved && (
                <>
                  {/* Roll controls */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => handleRollInApp(trooper)}
                      className="text-[10px] px-3 py-1 border border-warn text-warn hover:bg-warn/10"
                    >
                      ROLL IN APP
                    </button>
                    <span className="text-muted text-[9px]">or</span>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      placeholder="ENTER RESULT"
                      value={inputResults[trooper.id] ?? ''}
                      onChange={e => {
                        setInputResults(prev => ({ ...prev, [trooper.id]: e.target.value }))
                        setRolledResults(prev => {
                          const next = { ...prev }
                          delete next[trooper.id]
                          return next
                        })
                      }}
                      className="bg-bg border border-border text-ink text-[10px] px-2 py-0.5 w-24"
                    />
                    {activeResult !== null && (
                      <span className="text-[10px] text-ink">→ {activeResult}</span>
                    )}
                  </div>

                  {/* Outcome + resolution */}
                  {activeResult !== null && outcome !== null && (
                    <div className="pl-1 flex flex-col gap-1.5">
                      {outcome === 'safe' && (
                        <div className="flex items-center gap-2">
                          <span className="text-ok text-[10px] font-bold">SAFE</span>
                          <button
                            onClick={() => handleResolveSafe(trooper, activeResult)}
                            className="text-[9px] px-2 py-0.5 border border-ok text-ok hover:bg-ok/10"
                          >
                            CONFIRM SAFE
                          </button>
                        </div>
                      )}
                      {outcome === 'direct_fire' && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-bad text-[10px] font-bold">DIRECT FIRE</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Injury resolution */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="lbl text-[9px]">INJURY DICE: {injuryDiceForTL(sector.tl)}</span>
                              <input
                                type="number"
                                min={0}
                                max={6}
                                placeholder="# injuries"
                                value={injuryInputs[trooper.id] ?? ''}
                                onChange={e => setInjuryInputs(prev => ({ ...prev, [trooper.id]: e.target.value }))}
                                className="bg-bg border border-border text-ink text-[10px] px-2 py-0.5 w-20"
                              />
                              <button
                                onClick={() => handleResolveInjury(trooper, activeResult)}
                                className="text-[9px] px-2 py-0.5 border border-bad text-bad hover:bg-bad/10"
                              >
                                SUFFER INJURY
                              </button>
                            </div>
                            {/* Suppressed option — disabled if already suppressed or Final Stand */}
                            {!isFinalStand && !isAlreadySuppressed && (
                              <button
                                onClick={() => handleResolveSuppressed(trooper, activeResult)}
                                className="text-[9px] px-2 py-0.5 border border-warn text-warn hover:bg-warn/10"
                              >
                                GO SUPPRESSED
                              </button>
                            )}
                            {isAlreadySuppressed && !isFinalStand && (
                              <span className="text-[9px] text-bad">ALREADY SUPPRESSED — must take injury</span>
                            )}
                            {isFinalStand && (
                              <span className="text-[9px] text-bad">FINAL STAND — must take injury</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {isResolved && (
                <div className="text-[9px] text-muted">
                  Rolled {resolvedResult.roll} — {resolvedResult.outcome === 'safe' ? 'SAFE' : `DIRECT FIRE (${resolvedResult.resolution})`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Proceed */}
      <div className="px-3 py-2 border-t border-border">
        <button
          disabled={!allResolved}
          onClick={() => setExchangeStep('momentum')}
          className="text-[10px] px-4 py-1 border border-warn text-warn disabled:opacity-40 disabled:cursor-not-allowed hover:bg-warn/10"
        >
          PROCEED TO MOMENTUM →
        </button>
        {!allResolved && (
          <span className="text-[9px] text-muted ml-2">
            ({nonBleedingOut.filter(t => !engagement.defenseResults[t.id]).length} pending)
          </span>
        )}
      </div>
    </div>
  )
}

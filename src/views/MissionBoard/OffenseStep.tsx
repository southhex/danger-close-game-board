import { useState } from 'react'
import { useStore } from '../../store'
import {
  offenseRollOutcome,
  momentumDeltaFromOutcome,
} from '../../utils/gameRules'
import { rollDice } from '../../utils/dice'
import { newId } from '../../utils/id'
import type {
  EngagementState,
  Trooper,
  MissionSector,
  DiceRoll,
  OffenseResult,
} from '../../types'

interface Props {
  engagement: EngagementState
  troopers: Trooper[]
  sector: MissionSector
  addRoll: (roll: DiceRoll) => void
}

export default function OffenseStep({ engagement, troopers, sector, addRoll }: Props) {
  const resolveOffenseRoll = useStore(s => s.resolveOffenseRoll)
  const setExchangeStep = useStore(s => s.setExchangeStep)
  const commitAttachedForce = useStore(s => s.commitAttachedForce)
  const mission = useStore(s => s.mission)

  const [rolledResult, setRolledResult] = useState<number | null>(null)
  const [inputResult, setInputResult] = useState('')
  const [chosenOutcome, setChosenOutcome] = useState<'hold_position' | 'success_at_cost' | null>(null)
  const [sacTrooperId, setSacTrooperId] = useState<string>('')
  const [htResults, setHtResults] = useState<Record<string, { hits: number; atCost: boolean }>>({})
  const [allRolls, setAllRolls] = useState<number[]>([])

  const currentMomentum = mission?.momentum ?? 0

  // Compute ATK pool breakdown
  const trooperRows = troopers.map(t => {
    const intent = engagement.intents[t.id]
    const action = intent?.action ?? 'fire'
    const atk = intent?.atkContribution ?? 0
    return { trooper: t, action, atk }
  })

  // Split normal vs hard-target rows
  const normalRows = trooperRows.filter(r => !engagement.intents[r.trooper.id]?.hardTargetId)
  const htRows = trooperRows.filter(r => engagement.intents[r.trooper.id]?.hardTargetId)

  const subtotal = normalRows.reduce((s, r) => s + r.atk, 0)

  // Modifiers
  const momentumBonus = engagement.momentumGainedLastExchange ? 1 : 0
  const trooperDiedBonus = engagement.trooperDiedLastExchange ? 1 : 0
  const atkPenalty = engagement.nextExchangeModifiers.atkPenalty
  const pressurePenalty = engagement.pressure
  const rawPool = subtotal + momentumBonus + trooperDiedBonus - atkPenalty - pressurePenalty
  // Pool ≤ 0 → disadvantage: roll 2d6 take lowest
  const isDisadvantage = rawPool <= 0
  const totalDice = isDisadvantage ? 2 : rawPool

  // Hard targets in use
  const targetedHTIds = new Set(
    troopers
      .map(t => engagement.intents[t.id]?.hardTargetId)
      .filter(Boolean),
  ) as Set<string>
  const targetedHTs = engagement.hardTargets.filter(ht => targetedHTIds.has(ht.id))

  const activeResult = rolledResult ?? (inputResult !== '' ? Number(inputResult) : null)
  const outcome = activeResult !== null ? offenseRollOutcome(activeResult) : null
  const needsChoice = outcome === 'hold_position' && chosenOutcome === null

  // Check for double-six (overwhelming success): roll ≥6 AND count of 6s ≥ tl+1
  const sixCount = allRolls.filter(r => r === 6).length
  const overwhelmingSix = activeResult !== null && activeResult >= 6 && sixCount >= sector.tl + 1

  function handleRollInApp() {
    const results = rollDice(totalDice, 6)
    setAllRolls(results)
    const result = isDisadvantage ? Math.min(...results) : Math.max(...results)
    setRolledResult(result)
    setInputResult('')
    setChosenOutcome(null)

    const diceRoll: DiceRoll = {
      id: newId(),
      timestamp: Date.now(),
      label: `Exchange ${engagement.exchangeNumber} — Offense${isDisadvantage ? ' (DISADVANTAGE)' : ''}`,
      dice: `${totalDice}d6`,
      results,
      modifier: 0,
      total: result,
    }
    addRoll(diceRoll)
  }

  function handleCommitForce(forceId: string) {
    commitAttachedForce(forceId)
  }

  function handleApply() {
    if (activeResult === null) return

    let finalOutcome: OffenseResult['outcome'] = outcome!
    if (outcome === 'hold_position' && chosenOutcome) {
      finalOutcome = chosenOutcome
    } else if (outcome === 'hold_position' && !chosenOutcome) {
      finalOutcome = 'hold_position'
    }

    let momentumDelta = momentumDeltaFromOutcome(finalOutcome)
    if (overwhelmingSix) momentumDelta = 2

    // Clamp to avoid going beyond ±3 from current (store handles clamping)
    const result: OffenseResult = {
      roll: activeResult,
      outcome: finalOutcome,
      chosenOutcome: chosenOutcome ?? undefined,
      momentumDelta,
      sacPenaltyTrooperId: finalOutcome === 'success_at_cost' && sacTrooperId ? sacTrooperId : undefined,
      hardTargetResults: htResults,
    }

    resolveOffenseRoll(result)
    setExchangeStep('defense')
  }

  const canApply =
    activeResult !== null &&
    !needsChoice &&
    // If outcome is success_at_cost, need sacTrooperId
    !(outcome === 'hold_position' && chosenOutcome === 'success_at_cost' && !sacTrooperId) &&
    // Hard targets: each targeted HT must have a result
    targetedHTs.every(ht => htResults[ht.id] !== undefined)

  function actionLabel(action: string): string {
    const map: Record<string, string> = {
      fire: 'Fire',
      move: 'Move',
      covering_fire: 'Covering Fire',
      special_gear: 'Gear',
      interact: 'Interact',
      improvise: 'Improvise',
      disengage: 'Disengage',
    }
    return map[action] ?? action
  }

  return (
    <div className="bg-surface border border-border">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <span className="lbl text-[10px]">EXCHANGE {engagement.exchangeNumber} — OFFENSE ROLL</span>
      </div>

      {/* ATK Pool Breakdown */}
      <div className="px-3 py-2 border-b border-border">
        <div className="lbl text-[9px] mb-1">ATK POOL</div>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-muted text-[9px]">
              <th className="text-left pr-4 font-normal lbl">TROOPER</th>
              <th className="text-left pr-4 font-normal lbl">INTENT</th>
              <th className="text-right font-normal lbl">ATK</th>
            </tr>
          </thead>
          <tbody>
            {normalRows.map(({ trooper, action, atk }) => (
              <tr key={trooper.id}>
                <td className="pr-4 text-ink py-0.5">{trooper.name}</td>
                <td className="pr-4 text-muted py-0.5">{actionLabel(action)}</td>
                <td className="text-right text-ink py-0.5">{atk}</td>
              </tr>
            ))}
            {htRows.length > 0 && (
              <>
                <tr>
                  <td colSpan={3} className="pt-1 pb-0.5 text-[9px] text-warn lbl">HARD TARGET POOL — separate roll, no momentum effect</td>
                </tr>
                {htRows.map(({ trooper, action, atk }) => {
                  const htId = engagement.intents[trooper.id]?.hardTargetId
                  const ht = engagement.hardTargets.find(h => h.id === htId)
                  return (
                    <tr key={trooper.id}>
                      <td className="pr-4 text-ink py-0.5">{trooper.name} → {ht?.name ?? htId}</td>
                      <td className="pr-4 text-muted py-0.5">{actionLabel(action)}</td>
                      <td className="text-right text-ink py-0.5">{atk}</td>
                    </tr>
                  )
                })}
              </>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <td colSpan={2} className="text-muted text-[9px] pt-1 lbl">OFFENSE POOL</td>
              <td className="text-right text-ink font-bold pt-1">{subtotal}</td>
            </tr>
          </tfoot>
        </table>

        {/* Modifiers */}
        <div className="mt-2 flex flex-col gap-0.5 text-[10px]">
          {momentumBonus > 0 && (
            <div className="flex justify-between">
              <span className="text-ok">+1 momentum last exchange</span>
              <span className="text-ok">+1</span>
            </div>
          )}
          {trooperDiedBonus > 0 && (
            <div className="flex justify-between">
              <span className="text-ok">+1 trooper died</span>
              <span className="text-ok">+1</span>
            </div>
          )}
          {atkPenalty > 0 && (
            <div className="flex justify-between">
              <span className="text-bad">−{atkPenalty} Pinned Down</span>
              <span className="text-bad">−{atkPenalty}</span>
            </div>
          )}
          {pressurePenalty > 0 && (
            <div className="flex justify-between">
              <span className="text-bad">−{pressurePenalty} Pressure</span>
              <span className="text-bad">−{pressurePenalty}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-1 mt-0.5">
            <span className="lbl text-[9px]">ROLL</span>
            {isDisadvantage
              ? <span className="text-bad font-bold text-[11px]">2D6 — TAKE LOWEST</span>
              : <span className="text-ink font-bold text-[11px]">{totalDice}D6 — TAKE HIGHEST</span>
            }
          </div>
        </div>
      </div>

      {/* Attached Forces Commit */}
      {engagement.attachedForces.filter(af => !af.committed).length > 0 && (
        <div className="px-3 py-2 border-b border-border">
          <div className="lbl text-[9px] mb-1">ATTACHED FORCES</div>
          <div className="flex flex-col gap-1">
            {engagement.attachedForces.filter(af => !af.committed).map(af => (
              <button
                key={af.id}
                onClick={() => handleCommitForce(af.id)}
                className="text-[10px] text-left text-muted border border-border px-2 py-0.5 hover:text-ink"
              >
                COMMIT {af.name} ({af.dice}d6)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Roll Input */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-3 flex-wrap">
        <button
          onClick={handleRollInApp}
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
          value={inputResult}
          onChange={e => {
            setInputResult(e.target.value)
            setRolledResult(null)
            setAllRolls([])
            setChosenOutcome(null)
          }}
          className="bg-bg border border-border text-ink text-[10px] px-2 py-0.5 w-24"
        />
        {allRolls.length > 0 && (
          <span className="text-[9px] text-muted">
            [{allRolls.join(', ')}]
          </span>
        )}
      </div>

      {/* Outcome */}
      {activeResult !== null && outcome !== null && (
        <div className="px-3 py-2 border-b border-border">
          <div className="lbl text-[9px] mb-1">OUTCOME</div>
          {outcome === 'pushed_back' && (
            <div className="text-bad text-[11px] font-bold">PUSHED BACK — MOMENTUM −1</div>
          )}
          {outcome === 'hold_position' && chosenOutcome === null && (
            <div className="flex flex-col gap-2">
              <div className="text-warn text-[11px] font-bold">CHOOSE OUTCOME</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setChosenOutcome('hold_position')}
                  className="text-[10px] px-3 py-1 border border-neutral text-neutral hover:text-ink"
                >
                  HOLD POSITION
                </button>
                <button
                  onClick={() => setChosenOutcome('success_at_cost')}
                  className="text-[10px] px-3 py-1 border border-ok text-ok hover:bg-ok/10"
                >
                  SUCCESS AT COST
                </button>
              </div>
            </div>
          )}
          {outcome === 'hold_position' && chosenOutcome === 'hold_position' && (
            <div className="text-neutral text-[11px] font-bold">HOLD POSITION — MOMENTUM +0</div>
          )}
          {outcome === 'hold_position' && chosenOutcome === 'success_at_cost' && (
            <div className="flex flex-col gap-2">
              <div className="text-ok text-[11px] font-bold">SUCCESS AT COST — MOMENTUM +1</div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="lbl text-[9px]">COST TO:</span>
                <select
                  value={sacTrooperId}
                  onChange={e => setSacTrooperId(e.target.value)}
                  className="bg-bg border border-border text-ink text-[9px] px-1 py-0.5"
                >
                  <option value="">— pick trooper —</option>
                  {troopers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {outcome === 'success' && (
            <div className="text-[11px] font-bold text-ok">
              {overwhelmingSix
                ? `OVERWHELMING SUCCESS — MOMENTUM +2 (${sixCount} sixes ≥ TL+1)`
                : 'SUCCESS — MOMENTUM +1'}
            </div>
          )}

          {/* Momentum delta preview */}
          {outcome !== 'hold_position' || chosenOutcome !== null ? (
            <div className="mt-1 text-[9px] text-muted">
              Momentum: {currentMomentum} → {
                (() => {
                  let delta = 0
                  if (outcome === 'pushed_back') delta = -1
                  else if (chosenOutcome === 'hold_position') delta = 0
                  else if (chosenOutcome === 'success_at_cost' || outcome === 'success') delta = overwhelmingSix ? 2 : 1
                  const next = Math.max(-3, Math.min(3, currentMomentum + delta))
                  return <span className={next > currentMomentum ? 'text-ok' : next < currentMomentum ? 'text-bad' : 'text-neutral'}>{next > 0 ? `+${next}` : next}</span>
                })()
              }
            </div>
          ) : null}
        </div>
      )}

      {/* Hard Target Results */}
      {targetedHTs.length > 0 && activeResult !== null && (
        <div className="px-3 py-2 border-b border-border">
          <div className="lbl text-[9px] mb-1">HARD TARGET HITS</div>
          <div className="flex flex-col gap-2">
            {targetedHTs.map(ht => {
              const res = htResults[ht.id]
              return (
                <div key={ht.id} className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-ink">{ht.name}</span>
                  <span className="text-[9px] text-muted">(6=Hit, 4-5=Hit at Cost)</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setHtResults(prev => ({ ...prev, [ht.id]: { hits: 1, atCost: false } }))}
                      className={`text-[9px] px-2 py-0.5 border ${res && !res.atCost && res.hits > 0 ? 'border-ok text-ok' : 'border-border text-muted hover:text-ink'}`}
                    >HIT</button>
                    <button
                      onClick={() => setHtResults(prev => ({ ...prev, [ht.id]: { hits: 1, atCost: true } }))}
                      className={`text-[9px] px-2 py-0.5 border ${res?.atCost ? 'border-warn text-warn' : 'border-border text-muted hover:text-ink'}`}
                    >HIT AT COST</button>
                    <button
                      onClick={() => setHtResults(prev => ({ ...prev, [ht.id]: { hits: 0, atCost: false } }))}
                      className={`text-[9px] px-2 py-0.5 border ${res && res.hits === 0 && !res.atCost ? 'border-bad text-bad' : 'border-border text-muted hover:text-ink'}`}
                    >MISS</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Apply */}
      <div className="px-3 py-2">
        <button
          disabled={!canApply}
          onClick={handleApply}
          className="text-[10px] px-4 py-1 border border-warn text-warn disabled:opacity-40 disabled:cursor-not-allowed hover:bg-warn/10"
        >
          APPLY RESULT → DEFENSE
        </button>
      </div>
    </div>
  )
}

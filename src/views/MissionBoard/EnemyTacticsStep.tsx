import { useState } from 'react'
import { useStore } from '../../store'
import { rollDie } from '../../utils/dice'
import { newId } from '../../utils/id'
import { enemyTacticFromRoll, pressureIncreases } from '../../utils/gameRules'
import type { EngagementState, Trooper, MissionSector, DiceRoll, EnemyTactic } from '../../types'

interface Props {
  engagement: EngagementState
  troopers: Trooper[]
  sector: MissionSector
  addRoll: (roll: DiceRoll) => void
}

const TACTIC_DESCRIPTIONS: Record<EnemyTactic, string> = {
  none: 'No enemy action this exchange.',
  reposition: 'Enemy repositions a flanking trooper.',
  scatter: 'One trooper must Move next exchange.',
  pinned_down: 'Squad suffers −2 ATK next exchange.',
  encircle: 'All Fortified troopers pushed to In Cover.',
  push_forward: 'All defensive positions drop one step.',
  fall_back: 'All offensive positions drop one step.',
}

const TACTIC_LABELS: Record<EnemyTactic, string> = {
  none: 'NONE',
  reposition: 'REPOSITION',
  scatter: 'SCATTER',
  pinned_down: 'PINNED DOWN',
  encircle: 'ENCIRCLE',
  push_forward: 'PUSH FORWARD',
  fall_back: 'FALL BACK',
}

export default function EnemyTacticsStep({ engagement, troopers, sector, addRoll }: Props) {
  const resolveEnemyTactics = useStore(s => s.resolveEnemyTactics)
  const beginNextExchange = useStore(s => s.beginNextExchange)
  const endEngagement = useStore(s => s.endEngagement)
  const nullifyTactic = useStore(s => s.nullifyTactic)
  const missionMomentum = useStore(s => s.mission?.momentum ?? 0)
  const missionSquadId = useStore(s => s.mission?.squadId ?? null)
  const squads = useStore(s => s.squads)

  const [naturalD6, setNaturalD6] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [applied, setApplied] = useState(false)
  const [repositionTrooperId, setRepositionTrooperId] = useState<string | null>(null)
  const [scatterTrooperId, setScatterTrooperId] = useState<string | null>(null)
  const [showTacticTable, setShowTacticTable] = useState(false)

  // SRD ch. 06 — only the Sergeant may nullify a Tactic, and only if not BO/Suppressed.
  const sergeantId = missionSquadId ? squads.find(s => s.id === missionSquadId)?.sergeantId ?? null : null
  const sergeant = sergeantId ? troopers.find(t => t.id === sergeantId) ?? null : null
  const nullifyDisabledReason =
    !sergeant ? 'no sergeant in active squad'
    : sergeant.status === 'bleedingout' ? 'Sergeant bleeding out'
    : sergeant.suppressed ? 'Sergeant suppressed'
    : sergeant.grit <= 0 ? 'Sergeant has no grit'
    : null
  const canNullify = nullifyDisabledReason === null

  const total = naturalD6 !== null ? naturalD6 + sector.tl : null
  const tactic: EnemyTactic | null = total !== null ? enemyTacticFromRoll(total) : null

  function handleRoll() {
    const result = rollDie(6)
    setNaturalD6(result)
    setInputValue('')
    setRepositionTrooperId(null)
    setScatterTrooperId(null)
    setApplied(false)

    const roll: DiceRoll = {
      id: newId(),
      timestamp: Date.now(),
      label: `Enemy Tactics — Natural`,
      dice: '1d6',
      results: [result],
      modifier: 0,
      total: result,
    }
    addRoll(roll)
  }

  function handleInputChange(val: string) {
    setInputValue(val)
    const num = Number(val)
    if (val !== '' && num >= 0 && num <= 6) {
      setNaturalD6(num)
    } else {
      setNaturalD6(null)
    }
    setRepositionTrooperId(null)
    setScatterTrooperId(null)
    setApplied(false)
  }

  const flankingTroopers = troopers.filter(t => t.offpos === 'flanking')

  function pickRandom<T>(arr: T[]): T | null {
    if (arr.length === 0) return null
    return arr[Math.floor(Math.random() * arr.length)]
  }

  function handleApply() {
    if (naturalD6 === null || total === null || tactic === null) return
    resolveEnemyTactics({
      naturalD6,
      total,
      tactic,
      repositionTrooperId: repositionTrooperId ?? undefined,
      scatterTrooperId: scatterTrooperId ?? undefined,
    })
    setApplied(true)
  }

  function handleNullify() {
    if (!sergeant || !canNullify) return
    nullifyTactic(sergeant.id)
    setApplied(true)  // prevent resolveEnemyTactics from being called after nullify
  }

  const canApply =
    naturalD6 !== null &&
    tactic !== null &&
    !applied &&
    (tactic !== 'reposition' || repositionTrooperId !== null || flankingTroopers.length === 0) &&
    (tactic !== 'scatter' || scatterTrooperId !== null)

  return (
    <div className="bg-surface border border-border">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="lbl text-[10px]">EXCHANGE {engagement.exchangeNumber} — ENEMY TACTICS</span>
        <button
          onClick={() => setShowTacticTable(s => !s)}
          className="text-[10px] text-muted hover:text-ink"
        >
          {showTacticTable ? '▴ HIDE' : '▾ TACTIC TABLE'}
        </button>
      </div>

      {/* Tactic table (collapsible) */}
      {showTacticTable && (
        <div className="px-3 py-2 border-b border-border text-[10px] text-muted">
          <div className="lbl text-[9px] mb-1">1D6 + TL → TACTIC</div>
          <div>2–4 · NONE — {TACTIC_DESCRIPTIONS.none}</div>
          <div>5 · REPOSITION — {TACTIC_DESCRIPTIONS.reposition}</div>
          <div>6 · SCATTER — {TACTIC_DESCRIPTIONS.scatter}</div>
          <div>7 · PINNED DOWN — {TACTIC_DESCRIPTIONS.pinned_down}</div>
          <div>8 · ENCIRCLE — {TACTIC_DESCRIPTIONS.encircle}</div>
          <div>9 · PUSH FORWARD — {TACTIC_DESCRIPTIONS.push_forward}</div>
          <div>10+ · FALL BACK — {TACTIC_DESCRIPTIONS.fall_back}</div>
        </div>
      )}

      {/* Info */}
      <div className="px-3 py-2 border-b border-border">
        <div className="text-[9px] text-muted">Natural d6 ≥ 4 → Pressure +1 (auto)</div>
      </div>

      {/* Roll section */}
      <div className="px-3 py-2 border-b border-border flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRoll}
            className="text-[10px] px-3 py-1 border border-warn text-warn hover:bg-warn/10"
          >
            ROLL 1D6
          </button>
          <span className="text-muted text-[9px]">or</span>
          <input
            type="number"
            min={0}
            max={6}
            placeholder="ENTER NATURAL"
            value={inputValue}
            onChange={e => handleInputChange(e.target.value)}
            className="bg-bg border border-border text-ink text-[10px] px-2 py-0.5 w-28"
          />
        </div>
        {naturalD6 !== null && total !== null && (
          <div className="text-[10px] text-muted">
            Natural{' '}
            <span className={pressureIncreases(naturalD6) ? 'text-bad' : 'text-ink'}>{naturalD6}</span>
            {' '}+ TL{sector.tl} = <span className="text-ink font-bold">{total}</span>
            {pressureIncreases(naturalD6) && (
              <span className="text-bad ml-2">PRESSURE +1</span>
            )}
          </div>
        )}
      </div>

      {/* Tactic display and apply UI */}
      {tactic !== null && (
        <div className="px-3 py-2 border-b border-border flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="text-[11px] font-bold text-warn">{TACTIC_LABELS[tactic]}</div>
            <div className="text-[10px] text-muted">{TACTIC_DESCRIPTIONS[tactic]}</div>
          </div>

          {/* Guided apply UI */}
          {!applied && (
            <div className="flex flex-col gap-2">
              {tactic === 'reposition' && (
                <div className="flex flex-col gap-1">
                  <div className="lbl text-[9px]">SELECT FLANKING TROOPER TO REPOSITION</div>
                  {flankingTroopers.length === 0 ? (
                    <div className="text-[9px] text-muted">No flanking troopers — no effect.</div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={repositionTrooperId ?? ''}
                        onChange={e => setRepositionTrooperId(e.target.value || null)}
                        className="bg-bg border border-border text-ink text-[9px] px-1 py-0.5"
                      >
                        <option value="">— pick trooper —</option>
                        {flankingTroopers.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const picked = pickRandom(flankingTroopers)
                          if (picked) setRepositionTrooperId(picked.id)
                        }}
                        className="text-[9px] px-2 py-0.5 border border-border text-muted hover:text-ink"
                      >
                        RANDOM
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tactic === 'scatter' && (
                <div className="flex flex-col gap-1">
                  <div className="lbl text-[9px]">SELECT TROOPER TO SCATTER</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={scatterTrooperId ?? ''}
                      onChange={e => setScatterTrooperId(e.target.value || null)}
                      className="bg-bg border border-border text-ink text-[9px] px-1 py-0.5"
                    >
                      <option value="">— pick trooper —</option>
                      {troopers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const picked = pickRandom(troopers)
                        if (picked) setScatterTrooperId(picked.id)
                      }}
                      className="text-[9px] px-2 py-0.5 border border-border text-muted hover:text-ink"
                    >
                      RANDOM
                    </button>
                  </div>
                </div>
              )}

              <button
                disabled={!canApply}
                onClick={handleApply}
                className="text-[10px] px-3 py-1 border border-warn text-warn disabled:opacity-40 disabled:cursor-not-allowed hover:bg-warn/10 self-start"
              >
                APPLY TACTIC
              </button>
            </div>
          )}

          {applied && (
            <div className="text-[9px] text-ok">TACTIC APPLIED</div>
          )}

          {/* Nullify section — Sergeant only, per SRD ch. 06 */}
          {tactic !== 'none' && !applied && (
            <div className="border-t border-border pt-2 flex flex-col gap-1">
              <div className="lbl text-[9px]">NULLIFY TACTIC — SERGEANT</div>
              <div className="text-[9px] text-muted">Pressure increase still occurs.</div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  disabled={!canNullify}
                  onClick={handleNullify}
                  className="text-[9px] px-2 py-0.5 border border-bad text-bad disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bad/10"
                >
                  NULLIFY (1 GRIT — {sergeant?.name ?? 'SERGEANT'}{sergeant ? `, ${sergeant.grit} LEFT` : ''})
                </button>
                {!canNullify && (
                  <span className="text-[9px] text-muted italic">{nullifyDisabledReason}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom buttons */}
      <div className="px-3 py-2 flex gap-2 flex-wrap">
        <button
          onClick={() => beginNextExchange()}
          className="text-[10px] px-3 py-1 border border-ok text-ok hover:bg-ok/10"
        >
          NEXT EXCHANGE →
        </button>
        <button
          onClick={() => endEngagement('disengage')}
          className="text-[10px] px-3 py-1 border border-border text-muted hover:text-ink"
        >
          END ENGAGEMENT — DISENGAGE
        </button>
        {missionMomentum === 3 && (
          <button
            onClick={() => endEngagement('victory')}
            className="text-[10px] px-3 py-1 border border-ok text-ok hover:bg-ok/10"
          >
            VICTORY →
          </button>
        )}
        {missionMomentum === -3 && (
          <button
            onClick={() => endEngagement('defeat')}
            className="text-[10px] px-3 py-1 border border-bad text-bad hover:bg-bad/10"
          >
            DEFEAT →
          </button>
        )}
      </div>
    </div>
  )
}

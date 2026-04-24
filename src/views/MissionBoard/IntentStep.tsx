import { useState } from 'react'
import { useStore } from '../../store'
import { calcFireAtk } from '../../utils/gameRules'
import { Stepper } from '../../components'
import MoveModal from './MoveModal'
import CoveringFireModal from './CoveringFireModal'
import GearActionModal from './GearActionModal'
import type {
  EngagementState,
  Trooper,
  MissionSector,
  HardTarget,
  TrooperIntent,
} from '../../types'

interface Props {
  engagement: EngagementState
  troopers: Trooper[]       // all active non-dead troopers
  sector: MissionSector
  hardTargets: HardTarget[]
}

type ActionKey = TrooperIntent['action']

const ACTION_OPTIONS: { key: ActionKey; label: string }[] = [
  { key: 'fire', label: 'FIRE' },
  { key: 'move', label: 'MOVE' },
  { key: 'covering_fire', label: 'COVERING FIRE' },
  { key: 'special_gear', label: 'GEAR' },
  { key: 'interact', label: 'INTERACT' },
  { key: 'improvise', label: 'IMPROVISE' },
]

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

function makeDefaultIntent(
  trooper: Trooper,
  action: ActionKey,
  sector: MissionSector,
  engagement: EngagementState,
): TrooperIntent {
  const base: TrooperIntent = {
    action,
    atkContribution: 0,
    ammoSpent: 0,
  }
  if (action === 'fire') {
    const atk = calcFireAtk({
      trooper,
      sector,
      lastMoved: engagement.trooperMovedLastExchange[trooper.id] ?? false,
      atkPenalty: engagement.nextExchangeModifiers.atkPenalty,
    })
    base.atkContribution = atk.total
  }
  return base
}

export default function IntentStep({ engagement, troopers, sector, hardTargets }: Props) {
  const setTrooperIntent = useStore(s => s.setTrooperIntent)
  const setExchangeStep = useStore(s => s.setExchangeStep)

  // Local UI state for modals
  const [moveModalFor, setMoveModalFor] = useState<string | null>(null)
  const [coveringFireFor, setCoveringFireFor] = useState<string | null>(null)
  const [gearActionFor, setGearActionFor] = useState<string | null>(null)

  // Per-trooper note state (for interact/improvise)
  const [notes, setNotes] = useState<Record<string, string>>({})
  // Per-trooper ammo state (local before dispatching)
  const [ammoSpent, setAmmoSpent] = useState<Record<string, number>>({})
  // Per-trooper hardTarget selection
  const [hardTargetSel, setHardTargetSel] = useState<Record<string, string>>({})

  function getIntent(trooperId: string): TrooperIntent | undefined {
    return engagement.intents[trooperId]
  }

  function getAction(trooperId: string): ActionKey | undefined {
    return engagement.intents[trooperId]?.action
  }

  function selectAction(trooper: Trooper, action: ActionKey) {
    const intent = makeDefaultIntent(trooper, action, sector, engagement)
    // Restore ammo/note overrides if we have them
    if (action === 'fire') {
      const spend = ammoSpent[trooper.id] ?? 0
      intent.ammoSpent = spend
      if (hardTargetSel[trooper.id]) intent.hardTargetId = hardTargetSel[trooper.id]
    }
    if (action === 'interact' || action === 'improvise') {
      intent.note = notes[trooper.id] ?? ''
    }
    setTrooperIntent(trooper.id, intent)
  }

  function updateAmmo(trooper: Trooper, newVal: number) {
    const clamped = Math.max(0, Math.min(trooper.ammo, newVal))
    setAmmoSpent(prev => ({ ...prev, [trooper.id]: clamped }))
    const existing = getIntent(trooper.id)
    if (existing && existing.action === 'fire') {
      setTrooperIntent(trooper.id, { ...existing, ammoSpent: clamped })
    }
  }

  function selectHardTarget(trooper: Trooper, htId: string) {
    setHardTargetSel(prev => ({ ...prev, [trooper.id]: htId }))
    const existing = getIntent(trooper.id)
    if (existing && existing.action === 'fire') {
      setTrooperIntent(trooper.id, { ...existing, hardTargetId: htId || undefined })
    }
  }

  function updateNote(trooper: Trooper, note: string) {
    setNotes(prev => ({ ...prev, [trooper.id]: note }))
    const existing = getIntent(trooper.id)
    if (existing && (existing.action === 'interact' || existing.action === 'improvise')) {
      setTrooperIntent(trooper.id, { ...existing, note })
    }
  }

  function handleMoveConfirm(trooper: Trooper, partial: Partial<TrooperIntent>) {
    const intent: TrooperIntent = {
      action: 'move',
      atkContribution: 0,
      ammoSpent: 0,
      ...partial,
    }
    setTrooperIntent(trooper.id, intent)
    setMoveModalFor(null)
  }

  function handleCoveringFireConfirm(trooper: Trooper, partial: Partial<TrooperIntent>) {
    const intent: TrooperIntent = {
      action: 'covering_fire',
      atkContribution: 0,
      ammoSpent: 0,
      ...partial,
    }
    setTrooperIntent(trooper.id, intent)
    setCoveringFireFor(null)
  }

  function handleGearConfirm(trooper: Trooper, partial: Partial<TrooperIntent>) {
    const intent: TrooperIntent = {
      action: 'special_gear',
      atkContribution: 0,
      ammoSpent: 0,
      ...partial,
    }
    setTrooperIntent(trooper.id, intent)
    setGearActionFor(null)
  }

  // Total ATK from all FIRE intents
  const totalAtk = troopers.reduce((sum, t) => {
    const intent = getIntent(t.id)
    if (intent && intent.action === 'fire') return sum + intent.atkContribution
    return sum
  }, 0)

  const allSet = troopers.every(t => getIntent(t.id) !== undefined)

  const moveModalTrooper = moveModalFor ? troopers.find(t => t.id === moveModalFor) : null
  const coveringFireTrooper = coveringFireFor ? troopers.find(t => t.id === coveringFireFor) : null
  const gearActionTrooper = gearActionFor ? troopers.find(t => t.id === gearActionFor) : null

  return (
    <div className="bg-surface border border-border">
      {/* Step header */}
      <div className="px-3 py-2 border-b border-border">
        <span className="lbl text-[10px]">EXCHANGE {engagement.exchangeNumber} — INTENT</span>
      </div>

      {/* Per-trooper rows */}
      <div className="divide-y divide-border">
        {troopers.map(trooper => {
          const action = getAction(trooper.id)
          const intent = getIntent(trooper.id)
          const suppressed = trooper.suppressed
          const hasGear = !!(trooper.special_weapon || trooper.special_gear)

          const atkBreakdown = action === 'fire'
            ? calcFireAtk({
                trooper,
                sector,
                lastMoved: engagement.trooperMovedLastExchange[trooper.id] ?? false,
                atkPenalty: engagement.nextExchangeModifiers.atkPenalty,
              })
            : null

          return (
            <div key={trooper.id} className="px-3 py-3 flex flex-col gap-2">
              {/* Trooper name + badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-ink text-[11px] font-bold">{trooper.name}</span>
                <span className={`text-[9px] px-1 border ${offposColor(trooper.offpos)}`}>
                  {offposLabel(trooper.offpos)}
                </span>
                <span className={`text-[9px] px-1 border ${defposColor(trooper.defpos)}`}>
                  {defposLabel(trooper.defpos)}
                </span>
                {suppressed && (
                  <span className="text-[9px] px-1 border border-bad text-bad">SUPPRESSED</span>
                )}
              </div>

              {/* Action selector */}
              <div className="flex gap-1 flex-wrap">
                {ACTION_OPTIONS.map(opt => {
                  const isDisabled =
                    (opt.key === 'fire' && suppressed) ||
                    (opt.key === 'covering_fire' && suppressed) ||
                    (opt.key === 'special_gear' && !hasGear)
                  return (
                    <button
                      key={opt.key}
                      disabled={isDisabled}
                      onClick={() => selectAction(trooper, opt.key)}
                      className={`text-[9px] px-2 py-0.5 border ${
                        action === opt.key
                          ? 'border-warn text-warn'
                          : isDisabled
                          ? 'border-border text-muted opacity-30 cursor-not-allowed'
                          : 'border-border text-muted hover:text-ink'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>

              {/* Action-specific inline controls */}
              {action === 'fire' && atkBreakdown && (
                <div className="flex flex-col gap-1.5 pl-1">
                  {/* ATK breakdown */}
                  <div className="text-[9px] text-muted">
                    ATK:{' '}
                    <span className="text-ink">base({atkBreakdown.base})</span>
                    {atkBreakdown.flanking !== 0 && (
                      <span className="text-ok"> flank(+{atkBreakdown.flanking})</span>
                    )}
                    {atkBreakdown.weapon !== 0 && (
                      <span className={atkBreakdown.weapon > 0 ? 'text-ok' : 'text-bad'}>
                        {' '}weapon({atkBreakdown.weapon > 0 ? '+' : ''}{atkBreakdown.weapon})
                      </span>
                    )}
                    {atkBreakdown.limited !== 0 && (
                      <span className="text-bad"> ltd({atkBreakdown.limited})</span>
                    )}
                    {atkBreakdown.atkPenalty !== 0 && (
                      <span className="text-bad"> pen({atkBreakdown.atkPenalty})</span>
                    )}
                    {' '}= <span className="text-ink font-bold">{atkBreakdown.total}</span>
                  </div>

                  {/* Ammo stepper */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Stepper
                      label="AMMO SPENT"
                      value={intent?.ammoSpent ?? 0}
                      min={0}
                      max={trooper.ammo}
                      onChange={v => updateAmmo(trooper, v)}
                    />
                    <span className="text-[9px] text-muted">(have {trooper.ammo})</span>
                  </div>

                  {/* Hard target redirect */}
                  {hardTargets.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="lbl text-[9px]">HARD TARGET:</span>
                      <button
                        onClick={() => selectHardTarget(trooper, hardTargetSel[trooper.id] ? '' : hardTargets[0].id)}
                        className={`text-[9px] px-2 py-0.5 border ${
                          hardTargetSel[trooper.id]
                            ? 'border-warn text-warn'
                            : 'border-border text-muted hover:text-ink'
                        }`}
                      >
                        {hardTargetSel[trooper.id] ? 'REDIRECTED' : 'REDIRECT →'}
                      </button>
                      {hardTargetSel[trooper.id] && (
                        <select
                          value={hardTargetSel[trooper.id]}
                          onChange={e => selectHardTarget(trooper, e.target.value)}
                          className="bg-bg border border-border text-ink text-[9px] px-1 py-0.5"
                        >
                          {hardTargets.map(ht => (
                            <option key={ht.id} value={ht.id}>{ht.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}

              {action === 'move' && (
                <div className="flex items-center gap-2">
                  {intent?.moveType ? (
                    <span className="text-[9px] text-ok">
                      {intent.moveType.replace('_', ' ').toUpperCase()}{' '}
                      {intent.mobilityRoll !== undefined && `(rolled ${intent.mobilityRoll} — ${intent.mobilityPassed ? 'PASS' : 'FAIL'})`}
                    </span>
                  ) : null}
                  <button
                    onClick={() => setMoveModalFor(trooper.id)}
                    className="text-[9px] px-2 py-0.5 border border-border text-muted hover:text-ink"
                  >
                    {intent?.moveType ? 'RECONFIGURE →' : 'CONFIGURE →'}
                  </button>
                </div>
              )}

              {action === 'covering_fire' && (
                <div className="flex items-center gap-2">
                  {intent?.coveringFireTargets && intent.coveringFireTargets.length > 0 ? (
                    <span className="text-[9px] text-ok">
                      {intent.coveringFireTargets.length} trooper{intent.coveringFireTargets.length !== 1 ? 's' : ''} covered
                    </span>
                  ) : null}
                  <button
                    onClick={() => setCoveringFireFor(trooper.id)}
                    className="text-[9px] px-2 py-0.5 border border-border text-muted hover:text-ink"
                  >
                    {intent?.coveringFireTargets?.length ? 'CHANGE TARGETS →' : 'SELECT TARGETS →'}
                  </button>
                </div>
              )}

              {action === 'special_gear' && (
                <div className="flex items-center gap-2">
                  {intent?.gearAction ? (
                    <span className="text-[9px] text-ok">
                      {intent.gearAction.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  ) : null}
                  <button
                    onClick={() => setGearActionFor(trooper.id)}
                    className="text-[9px] px-2 py-0.5 border border-border text-muted hover:text-ink"
                  >
                    {intent?.gearAction ? 'CHANGE →' : 'USE GEAR →'}
                  </button>
                </div>
              )}

              {(action === 'interact' || action === 'improvise') && (
                <input
                  type="text"
                  placeholder="Note (optional)..."
                  value={notes[trooper.id] ?? ''}
                  onChange={e => updateNote(trooper, e.target.value)}
                  className="bg-bg border border-border text-ink text-[10px] px-2 py-0.5 w-full max-w-xs"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Running ATK total + proceed */}
      <div className="px-3 py-2 border-t border-border flex items-center justify-between flex-wrap gap-2">
        <div className="text-[10px]">
          <span className="lbl text-[9px]">TOTAL ATK POOL: </span>
          <span className="text-ink font-bold text-[12px]">{totalAtk}</span>
        </div>
        <button
          disabled={!allSet}
          onClick={() => setExchangeStep('offense')}
          className="text-[10px] px-4 py-1 border border-warn text-warn disabled:opacity-40 disabled:cursor-not-allowed hover:bg-warn/10"
        >
          PROCEED TO OFFENSE →
        </button>
      </div>

      {/* Modals */}
      {moveModalTrooper && (
        <MoveModal
          trooper={moveModalTrooper}
          sector={sector}
          engagement={engagement}
          open={moveModalFor !== null}
          onClose={() => setMoveModalFor(null)}
          onConfirm={partial => handleMoveConfirm(moveModalTrooper, partial)}
        />
      )}
      {coveringFireTrooper && (
        <CoveringFireModal
          trooper={coveringFireTrooper}
          allTroopers={troopers}
          sector={sector}
          open={coveringFireFor !== null}
          onClose={() => setCoveringFireFor(null)}
          onConfirm={partial => handleCoveringFireConfirm(coveringFireTrooper, partial)}
        />
      )}
      {gearActionTrooper && (
        <GearActionModal
          trooper={gearActionTrooper}
          sector={sector}
          hardTargets={hardTargets}
          allTroopers={troopers}
          open={gearActionFor !== null}
          onClose={() => setGearActionFor(null)}
          onConfirm={partial => handleGearConfirm(gearActionTrooper, partial)}
        />
      )}
    </div>
  )
}

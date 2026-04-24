import { useState } from 'react'
import { Modal } from '../../components'
import { rollDie } from '../../utils/dice'
import { newId } from '../../utils/id'
import { lookupRollTable } from '../../utils/gameRules'
import { useStore } from '../../store'
import { gearByName } from '../../data/gear'
import type { Trooper, MissionSector, HardTarget, TrooperIntent } from '../../types'

interface Props {
  trooper: Trooper
  sector: MissionSector
  hardTargets: HardTarget[]
  allTroopers: Trooper[]
  open: boolean
  onClose: () => void
  onConfirm: (intent: Partial<TrooperIntent>) => void
}

type GearActionKey = string

export default function GearActionModal({
  trooper,
  sector,
  hardTargets,
  allTroopers,
  open,
  onClose,
  onConfirm,
}: Props) {
  const addRoll = useStore(s => s.addRoll)
  const [selectedAction, setSelectedAction] = useState<GearActionKey>('')
  const [selectedTargets, setSelectedTargets] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [plasmaRoll, setPlasmaRoll] = useState<number | null>(null)
  const [plasmaResult, setPlasmaResult] = useState<string | null>(null)
  const [radioEta, setRadioEta] = useState<number | null>(null)
  const [flareCondition, setFlareCondition] = useState<'open_sky' | 'normal' | 'obstructed'>('normal')
  const [hmgTargets, setHmgTargets] = useState<Set<string>>(new Set())

  const gearName = trooper.special_weapon || trooper.special_gear
  const gearItem = gearName ? gearByName(gearName) : undefined

  function reset() {
    setSelectedAction('')
    setSelectedTargets([])
    setNote('')
    setPlasmaRoll(null)
    setPlasmaResult(null)
    setRadioEta(null)
    setFlareCondition('normal')
    setHmgTargets(new Set())
  }

  function handleClose() {
    reset()
    onClose()
  }

  function rollPlasma() {
    const r = rollDie(6)
    setPlasmaRoll(r)
    const tableResult = gearItem?.roll_table
      ? lookupRollTable(gearItem.roll_table.entries, r)
      : `Roll: ${r}`
    setPlasmaResult(tableResult)
    addRoll({
      id: newId(),
      timestamp: Date.now(),
      label: `${trooper.name} Plasma Rifle`,
      dice: '1d6',
      results: [r],
      modifier: 0,
      total: r,
    })
  }

  function rollRadioEta() {
    const r = rollDie(2)
    setRadioEta(r)
    addRoll({
      id: newId(),
      timestamp: Date.now(),
      label: `${trooper.name} Artillery ETA`,
      dice: '1d2',
      results: [r],
      modifier: 0,
      total: r,
    })
  }

  function toggleHmgTarget(id: string) {
    setHmgTargets(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 3) {
        next.add(id)
      }
      return next
    })
  }

  function handleConfirm() {
    let gearTargetsFinal: string[] = selectedTargets
    if (selectedAction === 'hmg_covering_fire') {
      gearTargetsFinal = Array.from(hmgTargets)
    }
    onConfirm({
      action: 'special_gear',
      gearAction: selectedAction,
      gearTargets: gearTargetsFinal,
      note: note || undefined,
      atkContribution: 0,
      ammoSpent: 0,
    })
    reset()
    onClose()
  }

  // ── Utility Kit ────────────────────────────────────────────────────────────
  function renderUtilityKit() {
    const actions = [
      { key: 'smoke', label: 'SMOKE', desc: 'Squad +1 Mobility, user may also Move.' },
      {
        key: 'flashbang',
        label: 'FLASHBANG',
        desc: 'User gains ATK benefit of Flanking this Exchange.',
        disabled: sector.space !== 0,
        disabledReason: 'Tight Space only (sector space must be 0)',
      },
      { key: 'flare', label: 'FLARE', desc: 'Signal aerial strike. Flanked troopers make Mobility Check.' },
    ]
    return (
      <div className="flex flex-col gap-3">
        {actions.map(a => (
          <div key={a.key}>
            <button
              disabled={a.disabled}
              onClick={() => setSelectedAction(a.key)}
              className={`text-[10px] px-3 py-1 border w-full text-left ${
                selectedAction === a.key
                  ? 'border-warn text-warn'
                  : a.disabled
                  ? 'border-border text-muted opacity-40 cursor-not-allowed'
                  : 'border-border text-muted hover:text-ink'
              }`}
            >
              {a.label}
              {a.disabled && a.disabledReason && (
                <span className="ml-2 text-[9px] opacity-60">({a.disabledReason})</span>
              )}
            </button>
            {selectedAction === a.key && <div className="text-[9px] text-muted mt-1 ml-1">{a.desc}</div>}
          </div>
        ))}

        {selectedAction === 'flare' && (
          <div className="mt-1">
            <div className="lbl text-[9px] mb-1">SKY CONDITIONS</div>
            {(['open_sky', 'normal', 'obstructed'] as const).map(cond => (
              <button
                key={cond}
                onClick={() => setFlareCondition(cond)}
                className={`text-[10px] px-2 py-0.5 border mr-2 ${
                  flareCondition === cond ? 'border-warn text-warn' : 'border-border text-muted'
                }`}
              >
                {cond === 'open_sky' ? 'OPEN SKY (+4 ATK)' : cond === 'normal' ? 'NORMAL (+3 ATK)' : 'OBSTRUCTED (+2 ATK)'}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── HMG ───────────────────────────────────────────────────────────────────
  function renderHMG() {
    const candidates = allTroopers.filter(t => t.id !== trooper.id)
    return (
      <div className="flex flex-col gap-3">
        <div className="text-[10px] text-muted">HMG Covering Fire: cover up to 3 troopers (+1 DEF each). Costs 1 Ammo.</div>
        <button
          onClick={() => setSelectedAction('hmg_covering_fire')}
          className={`text-[10px] px-3 py-1 border text-left ${
            selectedAction === 'hmg_covering_fire' ? 'border-warn text-warn' : 'border-border text-muted hover:text-ink'
          }`}
        >
          HMG COVERING FIRE
        </button>
        {selectedAction === 'hmg_covering_fire' && (
          <div className="flex flex-col gap-1">
            <div className="lbl text-[9px]">SELECT TARGETS (max 3)</div>
            {candidates.map(t => {
              const isSel = hmgTargets.has(t.id)
              const atMax = hmgTargets.size >= 3 && !isSel
              return (
                <button
                  key={t.id}
                  onClick={() => toggleHmgTarget(t.id)}
                  disabled={atMax}
                  className={`flex items-center gap-2 px-2 py-1 border text-left text-[10px] ${
                    isSel ? 'border-ok text-ok' : atMax ? 'opacity-40 border-border text-muted cursor-not-allowed' : 'border-border text-muted hover:text-ink'
                  }`}
                >
                  <span className={`w-3 h-3 border inline-block ${isSel ? 'bg-ok border-ok' : 'border-muted'}`} />
                  {t.name}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Grenade Launcher ────────────────────────────────────────────────────
  function renderGrenadeLauncher() {
    const groundHTs = hardTargets.filter(ht => ht.isGround)
    return (
      <div className="flex flex-col gap-3">
        <button
          onClick={() => { setSelectedAction('grenade_hard_target'); setSelectedTargets([]) }}
          disabled={groundHTs.length === 0}
          className={`text-[10px] px-3 py-1 border text-left ${
            selectedAction === 'grenade_hard_target' ? 'border-warn text-warn' : groundHTs.length === 0 ? 'opacity-40 border-border text-muted cursor-not-allowed' : 'border-border text-muted hover:text-ink'
          }`}
        >
          HARD TARGET HIT (1 Hit) {groundHTs.length === 0 && '— no ground HTs'}
        </button>
        {selectedAction === 'grenade_hard_target' && groundHTs.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="lbl text-[9px]">SELECT TARGET</div>
            {groundHTs.map(ht => (
              <button
                key={ht.id}
                onClick={() => setSelectedTargets([ht.id])}
                className={`text-[10px] px-2 py-1 border text-left ${
                  selectedTargets[0] === ht.id ? 'border-warn text-warn' : 'border-border text-muted hover:text-ink'
                }`}
              >
                {ht.name} ({ht.currentHp}/{ht.maxHp} HP)
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => { setSelectedAction('grenade_flanking_ally'); setSelectedTargets([]) }}
          className={`text-[10px] px-3 py-1 border text-left ${
            selectedAction === 'grenade_flanking_ally' ? 'border-warn text-warn' : 'border-border text-muted hover:text-ink'
          }`}
        >
          GRANT FLANKING BONUS (next Offense Roll to ally)
        </button>
        {selectedAction === 'grenade_flanking_ally' && (
          <div className="flex flex-col gap-1">
            <div className="lbl text-[9px]">SELECT ALLY</div>
            {allTroopers.filter(t => t.id !== trooper.id).map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTargets([t.id])}
                className={`text-[10px] px-2 py-1 border text-left ${
                  selectedTargets[0] === t.id ? 'border-warn text-warn' : 'border-border text-muted hover:text-ink'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Rocket Launcher ─────────────────────────────────────────────────────
  function renderRocketLauncher() {
    const used = trooper.special_weapon_uses === 0
    const groundHTs = hardTargets.filter(ht => ht.isGround)
    return (
      <div className="flex flex-col gap-3">
        {used && (
          <div className="text-[10px] text-bad">Rocket Launcher already used (0 uses remaining).</div>
        )}
        <button
          disabled={used}
          onClick={() => { setSelectedAction('rocket_atk'); setSelectedTargets([]) }}
          className={`text-[10px] px-3 py-1 border text-left ${
            selectedAction === 'rocket_atk' ? 'border-warn text-warn' : used ? 'opacity-40 border-border text-muted cursor-not-allowed' : 'border-border text-muted hover:text-ink'
          }`}
        >
          +3 ATK (single use)
        </button>
        <button
          disabled={used || groundHTs.length === 0}
          onClick={() => { setSelectedAction('rocket_ht_hits'); setSelectedTargets([]) }}
          className={`text-[10px] px-3 py-1 border text-left ${
            selectedAction === 'rocket_ht_hits' ? 'border-warn text-warn' : (used || groundHTs.length === 0) ? 'opacity-40 border-border text-muted cursor-not-allowed' : 'border-border text-muted hover:text-ink'
          }`}
        >
          2 HITS on Hard Target {groundHTs.length === 0 && '— no ground HTs'}
        </button>
        {selectedAction === 'rocket_ht_hits' && groundHTs.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="lbl text-[9px]">SELECT TARGET</div>
            {groundHTs.map(ht => (
              <button
                key={ht.id}
                onClick={() => setSelectedTargets([ht.id])}
                className={`text-[10px] px-2 py-1 border text-left ${
                  selectedTargets[0] === ht.id ? 'border-warn text-warn' : 'border-border text-muted hover:text-ink'
                }`}
              >
                {ht.name} ({ht.currentHp}/{ht.maxHp} HP)
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Plasma Rifle ────────────────────────────────────────────────────────
  function renderPlasmaRifle() {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-[10px] text-muted">No Ammo cost. Roll 1d6 for outcome.</div>
        <button
          onClick={() => { setSelectedAction('plasma_fire'); rollPlasma() }}
          className={`text-[10px] px-3 py-1 border text-left ${
            selectedAction === 'plasma_fire' ? 'border-warn text-warn' : 'border-border text-muted hover:text-ink'
          }`}
        >
          FIRE PLASMA RIFLE (Roll 1d6)
        </button>
        {plasmaRoll !== null && (
          <div className="bg-bg border border-border p-2">
            <div className="lbl text-[9px] mb-1">ROLL: {plasmaRoll}</div>
            <div className={`text-[10px] font-bold ${plasmaRoll === 1 ? 'text-bad' : plasmaRoll <= 3 ? 'text-warn' : 'text-ok'}`}>
              {plasmaResult}
            </div>
          </div>
        )}
        {selectedAction === 'plasma_fire' && plasmaRoll === null && (
          <button
            onClick={rollPlasma}
            className="text-[10px] text-ok border border-ok px-3 py-1 hover:bg-ok/10"
          >
            ROLL 1D6
          </button>
        )}
      </div>
    )
  }

  // ── Radio Gear ──────────────────────────────────────────────────────────
  function renderRadioGear() {
    const used = trooper.special_gear_uses === 0
    return (
      <div className="flex flex-col gap-3">
        {used && (
          <div className="text-[10px] text-bad">Radio Gear already used this mission.</div>
        )}
        <div className="text-[10px] text-muted">
          Once per mission: +2 Momentum, destroy all ground Hard Targets. All troopers Mobility Check (fail = 1d3 Injury). Hits in 1d2 Exchanges.
        </div>
        <button
          disabled={used}
          onClick={() => { setSelectedAction('artillery_strike'); rollRadioEta() }}
          className={`text-[10px] px-3 py-1 border ${
            selectedAction === 'artillery_strike' ? 'border-warn text-warn' : used ? 'opacity-40 border-border text-muted cursor-not-allowed' : 'border-border text-muted hover:text-ink'
          }`}
        >
          CALL ARTILLERY STRIKE
        </button>
        {radioEta !== null && (
          <div className="text-[10px] text-ok">ETA: {radioEta} exchange{radioEta > 1 ? 's' : ''}</div>
        )}
      </div>
    )
  }

  // ── Jump Pack ───────────────────────────────────────────────────────────
  function renderJumpPack() {
    const used = trooper.special_gear_uses === 0
    return (
      <div className="flex flex-col gap-3">
        {used && (
          <div className="text-[10px] text-bad">Jump Pack already used this engagement.</div>
        )}
        <div className="text-[10px] text-muted">
          Once per engagement: instantly shift to any Offensive + Defensive position.
        </div>
        <button
          disabled={used}
          onClick={() => setSelectedAction('jump_pack_reposition')}
          className={`text-[10px] px-3 py-1 border ${
            selectedAction === 'jump_pack_reposition' ? 'border-warn text-warn' : used ? 'opacity-40 border-border text-muted cursor-not-allowed' : 'border-border text-muted hover:text-ink'
          }`}
        >
          JUMP REPOSITION
        </button>
        {selectedAction === 'jump_pack_reposition' && (
          <div>
            <div className="lbl text-[9px] mb-1">TARGET POSITIONS (note)</div>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Flanking / Fortified"
              className="bg-bg border border-border text-ink text-[10px] px-2 py-1 w-full"
            />
          </div>
        )}
      </div>
    )
  }

  // ── Demo Charges ────────────────────────────────────────────────────────
  function renderDemoCharges() {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-[10px] text-muted">
          Place charges during Engagement when Momentum ≥ GAINING GROUND. Requires 2 Exchanges (Move Up + set charges).
        </div>
        <button
          onClick={() => setSelectedAction('place_charges')}
          className={`text-[10px] px-3 py-1 border text-left ${
            selectedAction === 'place_charges' ? 'border-warn text-warn' : 'border-border text-muted hover:text-ink'
          }`}
        >
          PLACE CHARGES
        </button>
      </div>
    )
  }

  // ── Generic fallback ────────────────────────────────────────────────────
  function renderGeneric() {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-[10px] text-muted">{gearItem?.properties ?? 'Use gear action.'}</div>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Describe action..."
          className="bg-bg border border-border text-ink text-[10px] px-2 py-1 w-full"
        />
        <button
          onClick={() => setSelectedAction('generic_gear')}
          className={`text-[10px] px-3 py-1 border ${
            selectedAction === 'generic_gear' ? 'border-warn text-warn' : 'border-border text-muted hover:text-ink'
          }`}
        >
          USE GEAR
        </button>
      </div>
    )
  }

  function renderGearContent() {
    const sw = trooper.special_weapon
    const sg = trooper.special_gear
    if (sw === 'Utility Kit') return renderUtilityKit()
    if (sw === 'HMG') return renderHMG()
    if (sw === 'Grenade Launcher') return renderGrenadeLauncher()
    if (sw === 'Rocket Launcher') return renderRocketLauncher()
    if (sw === 'Plasma Rifle') return renderPlasmaRifle()
    if (sg === 'Radio Gear') return renderRadioGear()
    if (sg === 'Jump Pack') return renderJumpPack()
    if (sg === 'Demolition Charges') return renderDemoCharges()
    return renderGeneric()
  }

  const canConfirm = selectedAction !== '' || note !== ''

  return (
    <Modal open={open} onClose={handleClose} title={`GEAR ACTION — ${trooper.name} (${gearName ?? 'N/A'})`}>
      <div className="flex flex-col gap-4">
        {renderGearContent()}

        <div className="flex gap-2 pt-1 border-t border-border">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="text-[10px] px-4 py-1 border border-warn text-warn disabled:opacity-40 disabled:cursor-not-allowed hover:bg-warn/10"
          >
            CONFIRM GEAR ACTION
          </button>
          <button
            onClick={handleClose}
            className="text-[10px] px-4 py-1 border border-border text-muted hover:text-ink"
          >
            CANCEL
          </button>
        </div>
      </div>
    </Modal>
  )
}

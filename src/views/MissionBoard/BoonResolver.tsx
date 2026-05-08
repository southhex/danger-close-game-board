import { useState } from 'react'
import { useStore } from '../../store'
import { isDeployed } from '../../utils/gameRules'
import { rollDie } from '../../utils/dice'
import type { BoonType } from '../../types'

const BOON_LABELS: Record<BoonType, string> = {
  ammo_cache:        'AMMO CACHE',
  enemy_intel:       'ENEMY INTEL',
  prepared_ground:   'PREPARED GROUND',
  fallen_friendlies: 'FALLEN FRIENDLIES',
  positions_revealed:'POSITIONS REVEALED',
  rookies:           'ROOKIES',
}

interface Props {
  boonType: BoonType
  onResolved: () => void
}

export default function BoonResolver({ boonType, onResolved }: Props) {
  const mission = useStore(s => s.mission)
  const troopers = useStore(s => s.troopers)
  const applyAmmoCache = useStore(s => s.applyAmmoCache)
  const applyEnemyIntel = useStore(s => s.applyEnemyIntel)
  const applyFallenFriendlies = useStore(s => s.applyFallenFriendlies)
  const applyRookies = useStore(s => s.applyRookies)

  const deployedTroopers = troopers.filter(t => isDeployed(t, mission))

  // Fallen Friendlies state
  const [ffAmmo, setFfAmmo] = useState(0)
  const [ffAmmoTrooperId, setFfAmmoTrooperId] = useState('')
  const [ffWeapon, setFfWeapon] = useState('')
  const [ffWeaponTrooperId, setFfWeaponTrooperId] = useState('')
  const [ffRolled, setFfRolled] = useState(false)

  function rollFallenFriendlies() {
    const ammoRoll = rollDie(3)
    const weaponRoll = rollDie(6)
    const weapon = weaponRoll <= 3 ? 'LMG'
      : weaponRoll <= 5 ? 'Sniper Rifle'
      : 'Rocket Launcher'
    setFfAmmo(ammoRoll)
    setFfWeapon(weapon)
    if (deployedTroopers.length > 0) {
      setFfAmmoTrooperId(deployedTroopers[0].id)
      setFfWeaponTrooperId(deployedTroopers[0].id)
    }
    setFfRolled(true)
  }

  function handleFallenFriendliesApply() {
    applyFallenFriendlies({
      ammoTrooperId: ffAmmoTrooperId || undefined,
      ammo: ffAmmo,
      weaponTrooperId: ffWeaponTrooperId || undefined,
      weapon: ffWeapon,
    })
    onResolved()
  }

  return (
    <div className="border border-warn/40 p-3 flex flex-col gap-3">
      <div className="lbl text-[10px] text-warn">{BOON_LABELS[boonType]}</div>

      {boonType === 'ammo_cache' && (
        <>
          <div className="text-muted text-[10px]">All deployed troopers receive +1 AMMO (capped at ammo max).</div>
          <button
            onClick={() => { applyAmmoCache(); onResolved() }}
            className="border border-ok text-ok px-3 py-1 text-[10px] w-fit"
          >
            APPLY +1 AMMO TO ALL DEPLOYED
          </button>
        </>
      )}

      {boonType === 'enemy_intel' && (
        <>
          <div className="text-muted text-[10px]">Next advance roll gains +1 bonus (automatically applied).</div>
          <button
            onClick={() => { applyEnemyIntel(); onResolved() }}
            className="border border-ok text-ok px-3 py-1 text-[10px] w-fit"
          >
            APPLY +1 ADVANCE BONUS
          </button>
        </>
      )}

      {boonType === 'prepared_ground' && (
        <>
          <div className="text-muted text-[10px]">
            PREPARED GROUND — Auto +1 Momentum if the squad is pursued back to this sector.
            (Stage 2: note only — pursuit not yet modelled.)
          </div>
          <button onClick={onResolved} className="border border-border text-muted px-3 py-1 text-[10px] w-fit">
            NOTED — CONTINUE
          </button>
        </>
      )}

      {boonType === 'fallen_friendlies' && (
        <>
          {!ffRolled ? (
            <>
              <div className="text-muted text-[10px]">Roll 1d3 for ammo, 1d6 for a special weapon left behind.</div>
              <button onClick={rollFallenFriendlies} className="border border-warn text-warn px-3 py-1 text-[10px] w-fit">
                ROLL FALLEN FRIENDLIES
              </button>
            </>
          ) : (
            <>
              <div className="text-ink text-[10px]">Ammo found: <span className="text-warn">{ffAmmo}</span> — assign to:</div>
              <select
                value={ffAmmoTrooperId}
                onChange={e => setFfAmmoTrooperId(e.target.value)}
                className="bg-bg border border-border text-ink font-mono text-[11px] px-2 py-1"
              >
                <option value="">— skip —</option>
                {deployedTroopers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <div className="text-ink text-[10px]">Weapon found: <span className="text-warn">{ffWeapon}</span> — assign to:</div>
              <select
                value={ffWeaponTrooperId}
                onChange={e => setFfWeaponTrooperId(e.target.value)}
                className="bg-bg border border-border text-ink font-mono text-[11px] px-2 py-1"
              >
                <option value="">— skip —</option>
                {deployedTroopers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <button onClick={handleFallenFriendliesApply} className="border border-ok text-ok px-3 py-1 text-[10px] w-fit">
                APPLY & CONTINUE
              </button>
            </>
          )}
        </>
      )}

      {boonType === 'positions_revealed' && (
        <>
          <div className="text-muted text-[10px]">
            POSITIONS REVEALED — Adjoining sectors have their TL and Cover exposed.
            (Stage 2: note only — branching topology not yet supported.)
          </div>
          <button onClick={onResolved} className="border border-border text-muted px-3 py-1 text-[10px] w-fit">
            NOTED — CONTINUE
          </button>
        </>
      )}

      {boonType === 'rookies' && (
        <>
          <div className="text-muted text-[10px]">
            A squad of Rookies joins at the next engagement start (2 dice, not VIP, uncommitted).
          </div>
          <button
            onClick={() => { applyRookies(); onResolved() }}
            className="border border-ok text-ok px-3 py-1 text-[10px] w-fit"
          >
            ADD ROOKIES TO NEXT ENGAGEMENT
          </button>
        </>
      )}
    </div>
  )
}

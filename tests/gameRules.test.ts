import { describe, it, expect } from 'vitest'
import {
  effectiveMobility, flankingBonus, advanceModifier, advanceResult,
  momentumForResult, defposForResult, offposFromCheck, mobilityCheck,
  clampMomentum, fortifiedLimit, flankingLimit, canSetDefpos, canSetOffpos,
  stealthShouldClear, infiltrationPicks, woundCount, clampUses, lookupRollTable,
  offenseRollOutcome, momentumDeltaFromOutcome, defRollOutcome,
  injuryDiceForTL, enemyTacticFromRoll, pressureIncreases, hardTargetMaxHp,
  hardTargetDefHits, calcDefPool, calcFireAtk, weatherLabel, isDeployed,
} from '../src/utils/gameRules'
import type { Trooper, MissionSector, HardTarget, Mission } from '../src/types'

function mkTrooper(p: Partial<Trooper> = {}): Trooper {
  return {
    id: p.id ?? 't1', name: 'X', fullname: '', callsign: '',
    perkpoints: 0, mobility: 4, armor: '', weapon: '', special_weapon: '',
    special_gear: '', tag: '', perks: [], notes: '',
    squadId: null, recovering: false,
    grit: 3, ammo: 3, grit_max: 1, ammo_max: 3, status: 'ok',
    offpos: 'engaged', defpos: 'incover', suppressed: false, def_modifier: 0,
    special_weapon_uses: -1, special_gear_uses: -1, ...p,
  }
}

describe('effectiveMobility', () => {
  it('subtracts 1 for wounded', () => {
    expect(effectiveMobility(mkTrooper({ mobility: 4, status: 'wounded' }))).toBe(3)
  })
  it('subtracts 1 for bleedingout', () => {
    expect(effectiveMobility(mkTrooper({ mobility: 3, status: 'bleedingout' }))).toBe(2)
  })
  it('no change for ok/grazed', () => {
    expect(effectiveMobility(mkTrooper({ mobility: 4, status: 'grazed' }))).toBe(4)
  })
  it('clamps at 0', () => {
    expect(effectiveMobility(mkTrooper({ mobility: 0, status: 'wounded' }))).toBe(0)
  })
})

describe('flankingBonus', () => {
  it('0–3 = +1', () => { expect(flankingBonus(3)).toBe(1) })
  it('4 = +2', () => { expect(flankingBonus(4)).toBe(2) })
  it('5 = +3', () => { expect(flankingBonus(5)).toBe(3) })
})

describe('advanceModifier', () => {
  it('fatigue is −floor(rolls/3)', () => {
    const m = advanceModifier({ advanceRolls: 7, wounds: 0, weather: 0, tl: 1, stealth: false, assaultAmmo: 0, droneBonus: 0 })
    expect(m.fatigue).toBe(-2)
  })
  it('combines all parts', () => {
    const m = advanceModifier({ advanceRolls: 3, wounds: 1, weather: -1, tl: 2, stealth: true, assaultAmmo: 2, droneBonus: 0 })
    // fatigue=-1, wounds=-1, weather=-1, tl=-2, stealth=+3, assault=+2, drone=0
    expect(m.total).toBe(0)
  })
  it('droneBonus adds to total', () => {
    const m = advanceModifier({ advanceRolls: 0, wounds: 0, weather: 0, tl: 0, stealth: false, assaultAmmo: 0, droneBonus: 1 })
    expect(m.drone).toBe(1)
    expect(m.total).toBe(1)
  })
})

describe('advanceResult table', () => {
  it('≤3 ambushed', () => { expect(advanceResult(3)).toBe('ambushed') })
  it('4–7 spotted', () => { expect(advanceResult(7)).toBe('spotted') })
  it('8–10 surprise', () => { expect(advanceResult(10)).toBe('surprise') })
  it('≥11 overwhelm', () => { expect(advanceResult(11)).toBe('overwhelm') })
})

describe('derived from result', () => {
  it('momentum', () => {
    expect(momentumForResult('ambushed')).toBe(-1)
    expect(momentumForResult('spotted')).toBe(0)
    expect(momentumForResult('surprise')).toBe(1)
    expect(momentumForResult('overwhelm')).toBeNull()
  })
  it('defpos', () => {
    expect(defposForResult('ambushed')).toBe('flanked')
    expect(defposForResult('spotted')).toBe('incover')
    expect(defposForResult('surprise')).toBe('fortified')
    expect(defposForResult('overwhelm')).toBeNull()
  })
})

describe('offpos from mobility check', () => {
  it('ambushed pass=engaged fail=limited', () => {
    expect(offposFromCheck('ambushed', true)).toBe('engaged')
    expect(offposFromCheck('ambushed', false)).toBe('limited')
  })
  it('spotted/surprise pass=flanking fail=engaged', () => {
    expect(offposFromCheck('spotted', true)).toBe('flanking')
    expect(offposFromCheck('spotted', false)).toBe('engaged')
    expect(offposFromCheck('surprise', true)).toBe('flanking')
  })
})

describe('mobilityCheck', () => {
  it('passes when roll ≤ mobility', () => {
    expect(mobilityCheck(4, 4)).toBe(true)
    expect(mobilityCheck(4, 3)).toBe(true)
  })
  it('fails when roll > mobility', () => {
    expect(mobilityCheck(4, 5)).toBe(false)
  })
  it('auto-fails at mobility 0', () => {
    expect(mobilityCheck(0, 1)).toBe(false)
  })
})

describe('clampMomentum', () => {
  it('clamps to -3..3', () => {
    expect(clampMomentum(-5)).toBe(-3)
    expect(clampMomentum(5)).toBe(3)
    expect(clampMomentum(0)).toBe(0)
  })
})

describe('position constraints', () => {
  it('fortifiedLimit', () => {
    expect(fortifiedLimit(0)).toBe(0)
    expect(fortifiedLimit(1)).toBe(2)
    expect(fortifiedLimit(2)).toBe(Infinity)
  })
  it('flankingLimit', () => {
    expect(flankingLimit(0)).toBe(0)
    expect(flankingLimit(1)).toBe(2)
    expect(flankingLimit(2)).toBe(Infinity)
  })
  it('canSetDefpos blocks 3rd fortified at cover 1', () => {
    const squad = [
      mkTrooper({ id: 'a', defpos: 'fortified' }),
      mkTrooper({ id: 'b', defpos: 'fortified' }),
      mkTrooper({ id: 'c', defpos: 'incover' }),
    ]
    expect(canSetDefpos(squad[2], 'fortified', squad, 1)).toBe(false)
    expect(canSetDefpos(squad[0], 'fortified', squad, 1)).toBe(true)
  })
  it('canSetOffpos blocks flanking at space 0', () => {
    const squad = [mkTrooper({ id: 'a' })]
    expect(canSetOffpos(squad[0], 'flanking', squad, 0)).toBe(false)
  })
})

describe('stealthShouldClear', () => {
  it('clears on ambushed/spotted, keeps on surprise/overwhelm', () => {
    expect(stealthShouldClear('ambushed')).toBe(true)
    expect(stealthShouldClear('spotted')).toBe(true)
    expect(stealthShouldClear('surprise')).toBe(false)
    expect(stealthShouldClear('overwhelm')).toBe(false)
  })
})

describe('infiltrationPicks', () => {
  it('floor(passes/2) if stealth was active', () => {
    expect(infiltrationPicks(3, true)).toBe(1)
    expect(infiltrationPicks(4, true)).toBe(2)
  })
  it('0 if stealth was not active', () => {
    expect(infiltrationPicks(5, false)).toBe(0)
  })
})

describe('woundCount', () => {
  it('counts wounded and bleedingout only', () => {
    const squad = [
      mkTrooper({ id: 'a', status: 'wounded' }),
      mkTrooper({ id: 'b', status: 'bleedingout' }),
      mkTrooper({ id: 'c', status: 'grazed' }),
    ]
    expect(woundCount(squad)).toBe(2)
  })
})

describe('clampUses', () => {
  it('passes through -1 unlimited sentinel unchanged', () => {
    expect(clampUses(-1, -1)).toBe(-1)
  })
  it('clamps to max', () => {
    expect(clampUses(5, 3)).toBe(3)
    expect(clampUses(0, 3)).toBe(0)
  })
})

function mkSector(p: Partial<MissionSector> = {}): MissionSector {
  return {
    id: 's1', name: 'Alpha', cover: 1, space: 2, tl: 2, weather: 0,
    status: 'active', ...p,
  }
}

function mkHardTarget(p: Partial<HardTarget> = {}): HardTarget {
  return {
    id: 'ht1', type: 'brute', name: 'Brute', maxHp: 1, currentHp: 1, isGround: true, ...p,
  }
}

describe('lookupRollTable', () => {
  const plasmaEntries = [
    { min: 1, max: 1, result: '+2 Injury — weapon destroyed' },
    { min: 2, max: 3, result: '+1 Injury, +1 ATK' },
    { min: 4, max: 5, result: '+2 ATK or 1 Hit (Hard Target)' },
    { min: 6, max: 6, result: '+3 ATK or 2 Hits (Hard Target)' },
  ]

  it('returns correct result for each range boundary', () => {
    expect(lookupRollTable(plasmaEntries, 1)).toBe('+2 Injury — weapon destroyed')
    expect(lookupRollTable(plasmaEntries, 2)).toBe('+1 Injury, +1 ATK')
    expect(lookupRollTable(plasmaEntries, 3)).toBe('+1 Injury, +1 ATK')
    expect(lookupRollTable(plasmaEntries, 4)).toBe('+2 ATK or 1 Hit (Hard Target)')
    expect(lookupRollTable(plasmaEntries, 5)).toBe('+2 ATK or 1 Hit (Hard Target)')
    expect(lookupRollTable(plasmaEntries, 6)).toBe('+3 ATK or 2 Hits (Hard Target)')
  })

  it('returns — for out-of-range roll', () => {
    expect(lookupRollTable(plasmaEntries, 0)).toBe('—')
    expect(lookupRollTable(plasmaEntries, 7)).toBe('—')
  })
})

// ─── Engagement flow tests ─────────────────────────────────────────────────

describe('offenseRollOutcome', () => {
  it('1 → pushed_back', () => { expect(offenseRollOutcome(1)).toBe('pushed_back') })
  it('3 → pushed_back', () => { expect(offenseRollOutcome(3)).toBe('pushed_back') })
  it('4 → hold_position', () => { expect(offenseRollOutcome(4)).toBe('hold_position') })
  it('5 → hold_position', () => { expect(offenseRollOutcome(5)).toBe('hold_position') })
  it('6 → success', () => { expect(offenseRollOutcome(6)).toBe('success') })
  it('10 → success', () => { expect(offenseRollOutcome(10)).toBe('success') })
})

describe('momentumDeltaFromOutcome', () => {
  it('pushed_back → -1', () => { expect(momentumDeltaFromOutcome('pushed_back')).toBe(-1) })
  it('hold_position → 0', () => { expect(momentumDeltaFromOutcome('hold_position')).toBe(0) })
  it('success_at_cost → 1', () => { expect(momentumDeltaFromOutcome('success_at_cost')).toBe(1) })
  it('success → 1', () => { expect(momentumDeltaFromOutcome('success')).toBe(1) })
})

describe('defRollOutcome', () => {
  it('flanked: 1–4 → direct_fire, 5–6 → safe', () => {
    expect(defRollOutcome(1, 'flanked')).toBe('direct_fire')
    expect(defRollOutcome(4, 'flanked')).toBe('direct_fire')
    expect(defRollOutcome(5, 'flanked')).toBe('safe')
    expect(defRollOutcome(6, 'flanked')).toBe('safe')
  })
  it('incover: 1–3 → direct_fire, 4–6 → safe', () => {
    expect(defRollOutcome(3, 'incover')).toBe('direct_fire')
    expect(defRollOutcome(4, 'incover')).toBe('safe')
  })
  it('fortified: 1–2 → direct_fire, 3–6 → safe', () => {
    expect(defRollOutcome(2, 'fortified')).toBe('direct_fire')
    expect(defRollOutcome(3, 'fortified')).toBe('safe')
    expect(defRollOutcome(6, 'fortified')).toBe('safe')
  })
})

describe('injuryDiceForTL', () => {
  it('TL 1 → "1"', () => { expect(injuryDiceForTL(1)).toBe('1') })
  it('TL 2 → "1d2"', () => { expect(injuryDiceForTL(2)).toBe('1d2') })
  it('TL 4 → "1d4"', () => { expect(injuryDiceForTL(4)).toBe('1d4') })
})

describe('enemyTacticFromRoll', () => {
  it('2 → none', () => { expect(enemyTacticFromRoll(2)).toBe('none') })
  it('4 → none', () => { expect(enemyTacticFromRoll(4)).toBe('none') })
  it('5 → reposition', () => { expect(enemyTacticFromRoll(5)).toBe('reposition') })
  it('7 → pinned_down', () => { expect(enemyTacticFromRoll(7)).toBe('pinned_down') })
  it('10 → fall_back', () => { expect(enemyTacticFromRoll(10)).toBe('fall_back') })
  it('12 → fall_back', () => { expect(enemyTacticFromRoll(12)).toBe('fall_back') })
})

describe('pressureIncreases', () => {
  it('3 → false', () => { expect(pressureIncreases(3)).toBe(false) })
  it('4 → true', () => { expect(pressureIncreases(4)).toBe(true) })
  it('6 → true', () => { expect(pressureIncreases(6)).toBe(true) })
})

describe('hardTargetMaxHp', () => {
  it('brute → 1', () => { expect(hardTargetMaxHp('brute')).toBe(1) })
  it('sniper → 1', () => { expect(hardTargetMaxHp('sniper')).toBe(1) })
  it('grenadier → 1', () => { expect(hardTargetMaxHp('grenadier')).toBe(1) })
  it('gun_nest → 2', () => { expect(hardTargetMaxHp('gun_nest')).toBe(2) })
  it('tank → 4', () => { expect(hardTargetMaxHp('tank')).toBe(4) })
})

describe('hardTargetDefHits', () => {
  it('tank hits all active non-dead troopers with -1', () => {
    const squad = [
      mkTrooper({ id: 'a' }),
      mkTrooper({ id: 'b' }),
      mkTrooper({ id: 'c', status: 'dead' }),
    ]
    const result = hardTargetDefHits(mkHardTarget({ type: 'tank' }), squad)
    expect(result).toEqual({ a: -1, b: -1 })
  })
  it('brute hits first 2 active troopers with -1', () => {
    const squad = [mkTrooper({ id: 'a' }), mkTrooper({ id: 'b' }), mkTrooper({ id: 'c' })]
    const result = hardTargetDefHits(mkHardTarget({ type: 'brute' }), squad)
    expect(result).toEqual({ a: -1, b: -1 })
  })
  it('sniper prefers flanked trooper with -2', () => {
    const squad = [
      mkTrooper({ id: 'a', defpos: 'incover' }),
      mkTrooper({ id: 'b', defpos: 'flanked' }),
    ]
    const result = hardTargetDefHits(mkHardTarget({ type: 'sniper' }), squad)
    expect(result).toEqual({ b: -2 })
  })
  it('sniper falls back to first trooper if no flanked', () => {
    const squad = [mkTrooper({ id: 'a', defpos: 'incover' })]
    const result = hardTargetDefHits(mkHardTarget({ type: 'sniper' }), squad)
    expect(result).toEqual({ a: -2 })
  })
})

describe('calcDefPool', () => {
  it('base 1 + covering fire + modifier', () => {
    expect(calcDefPool(mkTrooper({ armor: '' }), 2, 0)).toBe(3)
  })
  it('Light Armor gives -1', () => {
    expect(calcDefPool(mkTrooper({ armor: 'Light Armor' }), 0, 0)).toBe(1)  // 1 + -1 = 0, clamped to 1
  })
  it('Heavy Armor gives +1', () => {
    expect(calcDefPool(mkTrooper({ armor: 'Heavy Armor' }), 0, 0)).toBe(2)
  })
  it('minimum 1', () => {
    expect(calcDefPool(mkTrooper({ armor: 'Light Armor' }), 0, -5)).toBe(1)
  })
})

describe('calcFireAtk', () => {
  it('base ATK for engaged trooper is 1', () => {
    const result = calcFireAtk({
      trooper: mkTrooper({ offpos: 'engaged', defpos: 'incover', weapon: '', special_weapon: '' }),
      sector: mkSector(),
      lastMoved: false,
      atkPenalty: 0,
    })
    expect(result.base).toBe(1)
    expect(result.flanking).toBe(0)
    expect(result.limited).toBe(0)
    expect(result.total).toBe(1)
  })
  it('flanking adds flankingBonus', () => {
    const result = calcFireAtk({
      trooper: mkTrooper({ offpos: 'flanking', mobility: 4, status: 'ok' }),
      sector: mkSector(),
      lastMoved: false,
      atkPenalty: 0,
    })
    expect(result.flanking).toBe(2)  // mob 4 → +2
    expect(result.total).toBe(3)     // base 1 + flanking 2
  })
  it('limited gives -1', () => {
    const result = calcFireAtk({
      trooper: mkTrooper({ offpos: 'limited' }),
      sector: mkSector(),
      lastMoved: false,
      atkPenalty: 0,
    })
    expect(result.limited).toBe(-1)
    expect(result.total).toBe(0)  // 1 + -1 = 0
  })
  it('atkPenalty reduces total', () => {
    const result = calcFireAtk({
      trooper: mkTrooper({ offpos: 'engaged' }),
      sector: mkSector(),
      lastMoved: false,
      atkPenalty: 1,
    })
    expect(result.atkPenalty).toBe(-1)
    expect(result.total).toBe(0)
  })
  it('total never goes below 0', () => {
    const result = calcFireAtk({
      trooper: mkTrooper({ offpos: 'limited' }),
      sector: mkSector(),
      lastMoved: false,
      atkPenalty: 5,
    })
    expect(result.total).toBe(0)
  })
})

describe('weatherLabel', () => {
  it('formats each weather value', () => {
    expect(weatherLabel(-2)).toBe('EXTREME')
    expect(weatherLabel(-1)).toBe('HARSH')
    expect(weatherLabel(0)).toBe('CLEAR')
    expect(weatherLabel(1)).toBe('FAVORABLE')
  })
})

describe('isDeployed', () => {
  function mkMission(p: Partial<Mission> = {}): Mission {
    return {
      id: 'm1',
      campaignId: 'c1',
      status: 'live',
      name: 'Op',
      squadId: 'sq1',
      ...p,
    }
  }

  it('returns false for trooper with no squadId', () => {
    const t = mkTrooper({ squadId: null })
    expect(isDeployed(t, mkMission())).toBe(false)
  })

  it('returns true for trooper whose squadId matches a live mission', () => {
    const t = mkTrooper({ squadId: 'sq1' })
    expect(isDeployed(t, mkMission({ squadId: 'sq1', status: 'live' }))).toBe(true)
  })

  it('returns false when squadIds differ', () => {
    const t = mkTrooper({ squadId: 'sq2' })
    expect(isDeployed(t, mkMission({ squadId: 'sq1', status: 'live' }))).toBe(false)
  })

  it('returns false when mission is not live', () => {
    const t = mkTrooper({ squadId: 'sq1' })
    expect(isDeployed(t, mkMission({ squadId: 'sq1', status: 'blueprint' }))).toBe(false)
  })

  it('returns false for null mission', () => {
    const t = mkTrooper({ squadId: 'sq1' })
    expect(isDeployed(t, null)).toBe(false)
  })

  it('returns false when trooper has squadId but mission has no squadId', () => {
    const t = mkTrooper({ squadId: 'sq1' })
    expect(isDeployed(t, mkMission({ squadId: null }))).toBe(false)
  })
})

// ─── Stage 7: Sector determination roll helpers ───────────────────────────────
import { rollCover, rollSpace, rollTL, rollWeather, rollSectorContents, rollBoon } from '../src/utils/gameRules'

describe('rollTL', () => {
  it('1 → TL1', () => expect(rollTL(1)).toBe(1))
  it('2 → TL1', () => expect(rollTL(2)).toBe(1))
  it('3 → TL2', () => expect(rollTL(3)).toBe(2))
  it('4 → TL2', () => expect(rollTL(4)).toBe(2))
  it('5 → TL3', () => expect(rollTL(5)).toBe(3))
  it('6 → TL4', () => expect(rollTL(6)).toBe(4))
})

describe('rollCover', () => {
  it('1 → 0', () => expect(rollCover(1)).toBe(0))
  it('2 → 1', () => expect(rollCover(2)).toBe(1))
  it('3 → 1', () => expect(rollCover(3)).toBe(1))
  it('4 → 1', () => expect(rollCover(4)).toBe(1))
  it('5 → 2', () => expect(rollCover(5)).toBe(2))
  it('6 → 2', () => expect(rollCover(6)).toBe(2))
})

describe('rollSpace', () => {
  it('uses same brackets as rollCover', () => {
    for (let d = 1; d <= 6; d++) {
      expect(rollSpace(d)).toBe(rollCover(d))
    }
  })
})

describe('rollWeather', () => {
  it('1 → −2', () => expect(rollWeather(1)).toBe(-2))
  it('2 → −1', () => expect(rollWeather(2)).toBe(-1))
  it('3 → 0', () => expect(rollWeather(3)).toBe(0))
  it('5 → 0', () => expect(rollWeather(5)).toBe(0))
  it('6 → +1', () => expect(rollWeather(6)).toBe(1))
})

describe('rollSectorContents', () => {
  it('die=1 → nothing on all difficulties', () => {
    expect(rollSectorContents(1, 'routine').type).toBe('nothing')
    expect(rollSectorContents(1, 'hazardous').type).toBe('nothing')
    expect(rollSectorContents(1, 'desperate').type).toBe('nothing')
  })
  it('die=2 → boon on all difficulties', () => {
    expect(rollSectorContents(2, 'routine').type).toBe('boon')
    expect(rollSectorContents(2, 'hazardous').type).toBe('boon')
    expect(rollSectorContents(2, 'desperate').type).toBe('boon')
  })
  it('routine: die=3 → TL1', () => {
    const r = rollSectorContents(3, 'routine')
    expect(r.type).toBe('tl')
    if (r.type === 'tl') expect(r.tl).toBe(1)
  })
  it('routine: die=6 → TL3', () => {
    const r = rollSectorContents(6, 'routine')
    expect(r.type).toBe('tl')
    if (r.type === 'tl') expect(r.tl).toBe(3)
  })
  it('hazardous: die=3 → TL2', () => {
    const r = rollSectorContents(3, 'hazardous')
    expect(r.type).toBe('tl')
    if (r.type === 'tl') expect(r.tl).toBe(2)
  })
  it('hazardous: die=6 → TL4', () => {
    const r = rollSectorContents(6, 'hazardous')
    expect(r.type).toBe('tl')
    if (r.type === 'tl') expect(r.tl).toBe(4)
  })
  it('desperate: die=3 → TL2', () => {
    const r = rollSectorContents(3, 'desperate')
    expect(r.type).toBe('tl')
    if (r.type === 'tl') expect(r.tl).toBe(2)
  })
  it('desperate: die=6 → TL4', () => {
    const r = rollSectorContents(6, 'desperate')
    expect(r.type).toBe('tl')
    if (r.type === 'tl') expect(r.tl).toBe(4)
  })
})

describe('rollBoon', () => {
  it('maps each die 1–6 to a boon type', () => {
    expect(rollBoon(1)).toBe('ammo_cache')
    expect(rollBoon(2)).toBe('enemy_intel')
    expect(rollBoon(3)).toBe('prepared_ground')
    expect(rollBoon(4)).toBe('fallen_friendlies')
    expect(rollBoon(5)).toBe('positions_revealed')
    expect(rollBoon(6)).toBe('rookies')
  })
})

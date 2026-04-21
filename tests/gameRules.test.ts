import { describe, it, expect } from 'vitest'
import {
  effectiveMobility, flankingBonus, advanceModifier, advanceResult,
  momentumForResult, defposForResult, offposFromCheck, mobilityCheck,
  clampMomentum, fortifiedLimit, flankingLimit, canSetDefpos, canSetOffpos,
  stealthShouldClear, infiltrationPicks, woundCount, clampUses, lookupRollTable,
} from '../src/utils/gameRules'
import type { Trooper } from '../src/types'

function mkTrooper(p: Partial<Trooper> = {}): Trooper {
  return {
    id: p.id ?? 't1', name: 'X', fullname: '', callsign: '', active: true,
    perkpoints: 0, mobility: 4, armor: '', weapon: '', special_weapon: '',
    special_gear: '', perk: '', notes: '', grit: 3, ammo: 3, status: 'ok',
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
  it('counts active wounded and bleedingout only', () => {
    const squad = [
      mkTrooper({ id: 'a', status: 'wounded' }),
      mkTrooper({ id: 'b', status: 'bleedingout' }),
      mkTrooper({ id: 'c', status: 'grazed' }),
      mkTrooper({ id: 'd', status: 'wounded', active: false }),
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

import type {
  Trooper, AdvanceResult, OffensivePosition, DefensivePosition,
} from '../types'

export function effectiveMobility(t: Trooper): number {
  const penalty = (t.status === 'wounded' || t.status === 'bleedingout') ? 1 : 0
  return Math.max(0, t.mobility - penalty)
}

export function flankingBonus(effMob: number): number {
  if (effMob <= 3) return 1
  if (effMob === 4) return 2
  return 3
}

export function baseMobilityFromCosts(costs: number[]): number {
  return 5 + costs.reduce((acc, c) => acc + c, 0)
}

export function woundCount(troopers: Trooper[]): number {
  return troopers.filter(
    t => t.active && (t.status === 'wounded' || t.status === 'bleedingout'),
  ).length
}

export function advanceModifier(args: {
  advanceRolls: number
  wounds: number
  weather: number
  tl: number
  stealth: boolean
  assaultAmmo: number
}): {
  fatigue: number; wounds: number; weather: number; tl: number;
  stealth: number; assault: number; total: number
} {
  const fatigue = -Math.floor(args.advanceRolls / 3)
  const wounds = -args.wounds
  const weather = args.weather
  const tl = -args.tl
  const stealth = args.stealth ? 3 : 0
  const assault = args.assaultAmmo
  return {
    fatigue, wounds, weather, tl, stealth, assault,
    total: fatigue + wounds + weather + tl + stealth + assault,
  }
}

export function advanceResult(total: number): AdvanceResult {
  if (total <= 3) return 'ambushed'
  if (total <= 7) return 'spotted'
  if (total <= 10) return 'surprise'
  return 'overwhelm'
}

export function momentumForResult(r: AdvanceResult): number | null {
  if (r === 'ambushed') return -1
  if (r === 'spotted') return 0
  if (r === 'surprise') return 1
  return null
}

export function defposForResult(r: AdvanceResult): DefensivePosition | null {
  if (r === 'ambushed') return 'flanked'
  if (r === 'spotted') return 'incover'
  if (r === 'surprise') return 'fortified'
  return null
}

export function offposFromCheck(r: AdvanceResult, pass: boolean): OffensivePosition {
  if (r === 'ambushed') return pass ? 'engaged' : 'limited'
  return pass ? 'flanking' : 'engaged'
}

export function mobilityCheck(effMob: number, roll: number): boolean {
  if (effMob === 0) return false
  return roll <= effMob
}

export function clampMomentum(v: number): number {
  return Math.max(-3, Math.min(3, v))
}
export function clampGrit(v: number): number { return Math.max(0, Math.min(3, v)) }
export function clampAmmo(v: number): number { return Math.max(0, Math.min(3, v)) }
export function clampUses(v: number, max: number): number {
  if (max < 0) return max
  return Math.max(0, Math.min(max, v))
}

export function fortifiedLimit(cover: 0 | 1 | 2): number {
  if (cover === 0) return 0
  if (cover === 1) return 2
  return Infinity
}
export function flankingLimit(space: 0 | 1 | 2): number {
  if (space === 0) return 0
  if (space === 1) return 2
  return Infinity
}

export function canSetDefpos(
  target: Trooper,
  next: DefensivePosition,
  squad: Trooper[],
  cover: 0 | 1 | 2,
): boolean {
  if (next !== 'fortified') return true
  const currentFortified = squad.filter(
    t => t.active && t.id !== target.id && t.defpos === 'fortified',
  ).length
  return currentFortified + 1 <= fortifiedLimit(cover)
}

export function canSetOffpos(
  target: Trooper,
  next: OffensivePosition,
  squad: Trooper[],
  space: 0 | 1 | 2,
): boolean {
  if (next !== 'flanking') return true
  const currentFlanking = squad.filter(
    t => t.active && t.id !== target.id && t.offpos === 'flanking',
  ).length
  return currentFlanking + 1 <= flankingLimit(space)
}

export function stealthShouldClear(r: AdvanceResult): boolean {
  return r === 'ambushed' || r === 'spotted'
}

export function infiltrationPicks(passCount: number, stealthWasActive: boolean): number {
  if (!stealthWasActive) return 0
  return Math.floor(passCount / 2)
}

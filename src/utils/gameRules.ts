import type {
  Trooper, AdvanceResult, OffensivePosition, DefensivePosition, RollTableEntry,
  MissionSector, HardTarget, OffenseResult, EnemyTactic, Mission, MissionState,
} from '../types'

/**
 * A trooper is "deployed" on the live mission iff their squadId matches the
 * mission's squadId. Accepts both Mission (Stage 6+) and MissionState (during
 * the cutover) — both carry an optional squadId that points at the deployed squad.
 */
export function isDeployed(
  t: Trooper,
  mission: Mission | MissionState | null | undefined,
): boolean {
  if (!mission) return false
  if (!t.squadId) return false
  const m = mission as Mission & MissionState
  if (m.status !== undefined && m.status !== 'live') return false
  const missionSquadId = (m as { squadId?: string | null }).squadId
  if (!missionSquadId) return false
  return t.squadId === missionSquadId
}

export function effectiveMobility(t: Trooper): number {
  const penalty = (t.status === 'wounded' || t.status === 'bleedingout') ? 1 : 0
  return Math.max(0, t.mobility - penalty)
}

export function flankingBonus(effMob: number): number {
  if (effMob <= 3) return 1
  if (effMob === 4) return 2
  return 3
}

// costs are negative values from GearItem.mobility_cost (e.g. Heavy Armor = -2)
export function baseMobilityFromCosts(costs: number[]): number {
  return 5 + costs.reduce((acc, c) => acc + c, 0)
}

export function woundCount(troopers: Trooper[]): number {
  return troopers.filter(
    t => t.status === 'wounded' || t.status === 'bleedingout',
  ).length
}

export function advanceModifier(args: {
  advanceRolls: number
  wounds: number
  weather: number
  tl: number
  stealth: boolean
  assaultAmmo: number
  droneBonus: number
}): {
  fatigue: number; wounds: number; weather: number; tl: number;
  stealth: number; assault: number; drone: number; total: number
} {
  const fatigue = -Math.floor(args.advanceRolls / 3)
  const wounds = -args.wounds
  const weather = args.weather
  const tl = -args.tl
  const stealth = args.stealth ? 3 : 0
  const assault = args.assaultAmmo
  const drone = args.droneBonus
  return {
    fatigue, wounds, weather, tl, stealth, assault, drone,
    total: fatigue + wounds + weather + tl + stealth + assault + drone,
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
export function clampGrit(v: number, max = 3): number { return Math.max(0, Math.min(max, v)) }
export function clampAmmo(v: number, max = 3): number { return Math.max(0, Math.min(max, v)) }
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
    t => t.id !== target.id && t.defpos === 'fortified',
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
    t => t.id !== target.id && t.offpos === 'flanking',
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

export function lookupRollTable(entries: RollTableEntry[], roll: number): string {
  const entry = entries.find(e => roll >= e.min && roll <= e.max)
  return entry?.result ?? '—'
}

// ─── Engagement flow pure functions ────────────────────────────────────────

export function offenseRollOutcome(highest: number): OffenseResult['outcome'] {
  if (highest <= 3) return 'pushed_back'
  if (highest <= 5) return 'hold_position'
  return 'success'
}

export function momentumDeltaFromOutcome(outcome: OffenseResult['outcome']): number {
  if (outcome === 'pushed_back') return -1
  if (outcome === 'hold_position') return 0
  return 1  // success_at_cost and success both give +1
}

export function defRollOutcome(roll: number, defPos: DefensivePosition): 'safe' | 'direct_fire' {
  if (defPos === 'flanked') return roll >= 5 ? 'safe' : 'direct_fire'
  if (defPos === 'incover') return roll >= 4 ? 'safe' : 'direct_fire'
  return roll >= 3 ? 'safe' : 'direct_fire'  // fortified
}

export function injuryDiceForTL(tl: number): string {
  if (tl <= 1) return '1'
  return `1d${tl}`
}

export function enemyTacticFromRoll(total: number): EnemyTactic {
  if (total <= 4) return 'none'
  if (total === 5) return 'reposition'
  if (total === 6) return 'scatter'
  if (total === 7) return 'pinned_down'
  if (total === 8) return 'encircle'
  if (total === 9) return 'push_forward'
  return 'fall_back'
}

export function pressureIncreases(naturalD6: number): boolean {
  return naturalD6 >= 4
}

export function hardTargetMaxHp(type: HardTarget['type']): number {
  if (type === 'brute') return 1
  if (type === 'sniper') return 1
  if (type === 'grenadier') return 1
  if (type === 'gun_nest') return 2
  return 4  // tank
}

export function hardTargetDefHits(
  target: HardTarget,
  troopers: Trooper[],
): Record<string, number> {
  const active = troopers.filter(t => t.status !== 'dead')
  const result: Record<string, number> = {}

  if (target.type === 'tank') {
    for (const t of active) result[t.id] = -1
    return result
  }

  if (target.type === 'brute') {
    const targets = active.slice(0, 2)
    for (const t of targets) result[t.id] = -1
    return result
  }

  if (target.type === 'sniper') {
    const preferred = active.find(t => t.defpos === 'flanked') ?? active[0]
    if (preferred) result[preferred.id] = -2
    return result
  }

  if (target.type === 'grenadier') {
    const preferred = active.find(t => t.defpos === 'fortified') ?? active[0]
    if (preferred) result[preferred.id] = -2
    return result
  }

  // gun_nest: prefers Flanking (offensive position)
  const preferred = active.find(t => t.offpos === 'flanking') ?? active[0]
  if (preferred) result[preferred.id] = -1
  return result
}

function armorDefBonus(armor: string): number {
  if (armor === 'Light Armor') return -1
  if (armor === 'Heavy Armor') return 1
  return 0
}

export function calcDefPool(
  trooper: Trooper,
  coveringFireBonus: number,
  defModifier: number,
): number {
  return Math.max(1, 1 + armorDefBonus(trooper.armor) + coveringFireBonus + defModifier)
}

function weaponAtkBonus(trooper: Trooper, sector: MissionSector, lastMoved: boolean): number {
  switch (trooper.weapon) {
    case 'Carbine':
      if (trooper.offpos === 'engaged' && sector.space === 0) return 1
      if (trooper.offpos === 'engaged' && sector.space === 2) return -1
      return 0
    case 'Marksman Rifle':
      if (trooper.offpos === 'engaged' && sector.cover === 0) return 1
      if (trooper.offpos === 'engaged' && sector.cover === 2) return -1
      return 0
  }
  switch (trooper.special_weapon) {
    case 'Sniper Rifle': {
      let bonus = trooper.defpos === 'fortified' ? 1 : 0
      if (trooper.defpos === 'fortified' && !lastMoved) bonus += 1
      return bonus
    }
    case 'HMG':
      return trooper.defpos === 'fortified' ? 1 : 0
  }
  return 0
}

export function calcFireAtk(args: {
  trooper: Trooper
  sector: MissionSector
  lastMoved: boolean
  atkPenalty: number
}): { base: number; flanking: number; weapon: number; limited: number; atkPenalty: number; total: number } {
  const base = 1
  const flanking = args.trooper.offpos === 'flanking'
    ? flankingBonus(effectiveMobility(args.trooper))
    : 0
  const weapon = weaponAtkBonus(args.trooper, args.sector, args.lastMoved)
  const limited = args.trooper.offpos === 'limited' ? -1 : 0
  const atkPenalty = -args.atkPenalty
  const total = Math.max(0, base + flanking + weapon + limited + atkPenalty)
  return { base, flanking, weapon, limited, atkPenalty, total }
}

export function weatherLabel(weather: -2 | -1 | 0 | 1): string {
  if (weather === -2) return 'EXTREME'
  if (weather === -1) return 'HARSH'
  if (weather === 0)  return 'CLEAR'
  return 'FAVORABLE'
}

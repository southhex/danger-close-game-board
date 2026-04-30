export type TrooperStatus = 'ok' | 'grazed' | 'wounded' | 'bleedingout' | 'dead'
export type OffensivePosition = 'limited' | 'engaged' | 'flanking'
export type DefensivePosition = 'flanked' | 'incover' | 'fortified'
export type GearType = 'weapon' | 'specialweapon' | 'specialequipment' | 'armor'
export type AdvanceResult = 'ambushed' | 'spotted' | 'surprise' | 'overwhelm'

export interface RollTableEntry {
  min: number
  max: number
  result: string
}

export interface GearItem {
  name: string
  geartype: GearType
  description: string
  properties: string
  mobility_cost: number   // subtracted from 5
  reqcost: number
  max_uses: number        // -1 = unlimited
  roll_table?: {
    sides: number
    entries: RollTableEntry[]
  }
}

export interface Perk {
  name: string
  description: string
}

export interface Trooper {
  id: string
  name: string
  fullname: string
  callsign: string
  active: boolean
  perkpoints: number
  mobility: number         // effective base, auto-computed (5 − gear costs)
  armor: string
  weapon: string
  special_weapon: string
  special_gear: string
  tag: string              // '' = no tag
  perks: Perk[]
  notes: string

  // Mission-state
  grit: number
  grit_max: number        // 1–4, default 1 for new troopers
  ammo: number
  ammo_max: number        // 3–4, default 3
  status: TrooperStatus
  offpos: OffensivePosition
  defpos: DefensivePosition
  suppressed: boolean
  def_modifier: number
  special_weapon_uses: number   // -1 unlimited
  special_gear_uses: number
}

export interface MissionSector {
  id: string
  name: string
  cover: 0 | 1 | 2
  space: 0 | 1 | 2
  tl: 1 | 2 | 3 | 4
  weather: -2 | -1 | 0 | 1
  status: 'pending' | 'active' | 'cleared'
}

export interface MissionState {
  id: string
  name: string
  sectors: MissionSector[]
  activeSectorId: string
  phase: 'advance' | 'engagement' | 'catch_breath' | 'mission_complete'
  engagement: EngagementState | null
  momentum: number
  advance_rolls: number
  stealth: boolean
  notes: string
  transitionFromSectorId: string | null
}

export interface EngagementState {
  exchangeNumber: number
  step: 'intent' | 'offense' | 'defense' | 'momentum' | 'enemy_tactics'
  pressure: number
  hardTargets: HardTarget[]
  attachedForces: AttachedForce[]
  intents: Record<string, TrooperIntent>
  offenseResult: OffenseResult | null
  defenseResults: Record<string, DefenseResult>
  pendingTactic: EnemyTactic | null
  radioStrikeCountdown: number | null
  nextExchangeModifiers: NextExchangeModifiers
  momentumGainedLastExchange: boolean
  trooperDiedLastExchange: boolean
  trooperMovedLastExchange: Record<string, boolean>
  tankActsThisExchange: boolean
}

export interface NextExchangeModifiers {
  atkPenalty: number
  flankingDefPenalty: string[]
  mustMove: string[]
  flankedMustFallBack: string[]
}

export interface HardTarget {
  id: string
  type: 'brute' | 'sniper' | 'grenadier' | 'gun_nest' | 'tank'
  name: string
  maxHp: number
  currentHp: number
  isGround: boolean
}

export interface AttachedForce {
  id: string
  name: string
  dice: number
  isVip: boolean
  committed: boolean
}

export interface TrooperIntent {
  action: 'fire' | 'move' | 'covering_fire' | 'special_gear' | 'interact' | 'disengage' | 'improvise'
  atkContribution: number
  hardTargetId?: string
  ammoSpent: number
  moveType?: 'move_up' | 'fall_back' | 'reposition'
  mobilityRoll?: number
  mobilityPassed?: boolean
  coveringFireTargets?: string[]
  gearAction?: string
  gearTargets?: string[]
  note?: string
}

export interface OffenseResult {
  roll: number
  outcome: 'pushed_back' | 'hold_position' | 'success_at_cost' | 'success'
  chosenOutcome?: 'hold_position' | 'success_at_cost'
  momentumDelta: number
  sacPenaltyTrooperId?: string
  hardTargetResults: Record<string, { hits: number; atCost: boolean }>
}

export interface DefenseResult {
  roll: number
  outcome: 'safe' | 'direct_fire'
  resolution?: 'injury' | 'suppressed'
  injuryCount?: number
}

export type EnemyTactic = 'none' | 'reposition' | 'scatter' | 'pinned_down' | 'encircle' | 'push_forward' | 'fall_back'

export interface DiceRoll {
  id: string
  timestamp: number
  label: string
  dice: string
  results: number[]
  modifier: number
  total: number
  note?: string
}

export interface AppState {
  troopers: Trooper[]
  mission: MissionState | null
  diceHistory: DiceRoll[]
}

export interface ApplyAdvancePayload {
  result: AdvanceResult
  trooperOffpos?: Record<string, OffensivePosition>
}

export type View = 'hq' | 'barracks' | 'armoury' | 'mission' | 'settings'

export interface Campaign {
  id: string
  name: string
  description: string
  created_at: string
}

export interface User {
  username: string
}

export type AuthStatus = 'loading' | 'setup_required' | 'unauthenticated' | 'authenticated'

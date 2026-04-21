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
  name: string
  cover: 0 | 1 | 2
  space: 0 | 1 | 2
  tl: 1 | 2 | 3 | 4
  weather: -2 | -1 | 0 | 1
}

export interface MissionState {
  id: string
  name: string
  sector: MissionSector
  momentum: number
  advance_rolls: number
  stealth: boolean
  notes: string
}

export interface DiceRoll {
  id: string
  timestamp: number
  label: string
  dice: string
  results: number[]
  modifier: number
  total: number
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

export type View = 'barracks' | 'mission' | 'settings'

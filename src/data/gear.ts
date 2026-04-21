import type { GearItem } from '../types'

export const GEAR: GearItem[] = [
  // Armor
  { name: 'Light Armor', geartype: 'armor', description: 'Minimal plating.', properties: '−1 to final Defense Roll result.', mobility_cost: 0, reqcost: 0, max_uses: -1 },
  { name: 'Medium Armor', geartype: 'armor', description: 'Standard issue.', properties: 'No special properties. Standard issue.', mobility_cost: -1, reqcost: 0, max_uses: -1 },
  { name: 'Heavy Armor', geartype: 'armor', description: 'Full plating.', properties: '+1 to final Defense Roll result.', mobility_cost: -2, reqcost: 0, max_uses: -1 },

  // Primary weapons
  { name: 'Carbine', geartype: 'weapon', description: 'Close-quarters.', properties: '+1 ATK when Engaged in Tight Space (Cover 0). −1 ATK when Engaged in Open Space (Cover 2).', mobility_cost: 0, reqcost: 0, max_uses: -1 },
  { name: 'Assault Rifle', geartype: 'weapon', description: 'Reliable workhorse.', properties: 'No special properties. The reliable workhorse.', mobility_cost: 0, reqcost: 0, max_uses: -1 },
  { name: 'Marksman Rifle', geartype: 'weapon', description: 'Long range.', properties: '+1 ATK when Engaged in Exposed Cover (Cover 0). −1 ATK when Engaged in Dense Cover (Cover 2).', mobility_cost: 0, reqcost: 0, max_uses: -1 },

  // Special weapons
  { name: 'Utility Kit', geartype: 'specialweapon', description: 'Smoke / Flashbang / Flare.', properties: 'Active (1 Ammo each): Smoke — Squad gains +1 Mobility this Exchange, user may also Move. Flashbang (Tight Space only) — user gains ATK benefit of Flanking this Exchange. Flare (outdoors) — signal aerial strike; +2 ATK if sky obstructed, +3 ATK normally, +4 ATK open sky; all Flanked Troopers make Mobility Check (fail = 1d3 Injury).', mobility_cost: 0, reqcost: 0, max_uses: -1 },
  { name: 'LMG', geartype: 'specialweapon', description: 'Suppressing fire.', properties: 'Passive: +1 DEF for any Trooper receiving Covering Fire from this weapon.', mobility_cost: -1, reqcost: 1, max_uses: -1 },
  { name: 'HMG', geartype: 'specialweapon', description: 'Heavy support.', properties: 'Passive: +1 ATK when Fortified. Active (1 Ammo): Provide Covering Fire for up to 3 Troopers this round.', mobility_cost: -2, reqcost: 2, max_uses: -1 },
  { name: 'Sniper Rifle', geartype: 'specialweapon', description: 'Precision.', properties: 'Passive: +1 ATK when Fortified. +2 ATK when Fortified and did not Move last Exchange.', mobility_cost: -1, reqcost: 1, max_uses: -1 },
  { name: 'Grenade Launcher', geartype: 'specialweapon', description: 'Explosive utility.', properties: 'Active (1 Ammo each): Deal 1 Hit to a Hard Target, OR grant another Trooper the Flanking ATK bonus on the next Offense Roll. Multiple grenades may be fired in one attack.', mobility_cost: -1, reqcost: 1, max_uses: -1 },
  { name: 'Melee Weapon', geartype: 'specialweapon', description: 'Close combat.', properties: 'Passive: When Moving Up, choose to go Flanked instead of Flanking — gain +3 ATK (Flanking bonus included).', mobility_cost: -1, reqcost: 0, max_uses: -1 },
  { name: 'Rocket Launcher', geartype: 'specialweapon', description: 'Single-use.', properties: 'Active (single use): +3 ATK, OR deal 2 Hits to a Hard Target.', mobility_cost: -1, reqcost: 1, max_uses: 1 },
  { name: 'Plasma Rifle', geartype: 'specialweapon', description: 'Volatile.', properties: 'Active (no Ammo cost): Roll 1d6. 1 = +2 Injury, weapon destroyed. 2–3 = +1 Injury, +1 ATK. 4–5 = +2 ATK or 1 Hit (Hard Target). 6 = +3 ATK or 2 Hits (Hard Target).', mobility_cost: -1, reqcost: 3, max_uses: -1, roll_table: { sides: 6, entries: [{ min: 1, max: 1, result: '+2 Injury — weapon destroyed' }, { min: 2, max: 3, result: '+1 Injury, +1 ATK' }, { min: 4, max: 5, result: '+2 ATK or 1 Hit (Hard Target)' }, { min: 6, max: 6, result: '+3 ATK or 2 Hits (Hard Target)' }] } },

  // Special equipment
  { name: 'Demolition Charges', geartype: 'specialequipment', description: 'Breach objectives.', properties: 'No combat use. Required for Breach objectives. Place during Engagement if Momentum ≥ GAINING GROUND: 2 Exchanges (Move Up + set charges).', mobility_cost: -1, reqcost: 0, max_uses: -1 },
  { name: 'Jump Pack', geartype: 'specialequipment', description: 'Reposition.', properties: 'Once per Engagement: instantly shift to any Offensive/Defensive position. Resets each Engagement (player manually resets the use pip).', mobility_cost: -1, reqcost: 2, max_uses: 1 },
  { name: 'Drone Gear', geartype: 'specialequipment', description: 'Recon.', properties: '+1 to each Advance Roll. Does not stack with multiple Drone Gear.', mobility_cost: -1, reqcost: 0, max_uses: -1 },
  { name: 'Medic Gear', geartype: 'specialequipment', description: 'Field aid.', properties: 'Patch Wounded Troopers back to OK when out of combat (Catch Breath).', mobility_cost: -1, reqcost: 0, max_uses: -1 },
  { name: 'Radio Gear', geartype: 'specialequipment', description: 'Artillery.', properties: 'Once per Mission: call an artillery strike on the current Sector. Hits in 1d2 Exchanges. Effect: +2 Momentum instantly, destroys all ground-based Hard Targets. All Troopers make a Mobility Check; failure = 1d3 Injury.', mobility_cost: -1, reqcost: 1, max_uses: 1 },
  { name: 'Supply Backpack', geartype: 'specialequipment', description: '+6 extra Ammo.', properties: 'Holds 6 extra Ammo. Can be redistributed to Troopers out of combat.', mobility_cost: -1, reqcost: 1, max_uses: -1 },
  { name: 'Environmental Gear', geartype: 'specialequipment', description: 'Hazard protection.', properties: 'Allows Troopers to traverse hazardous terrain or survive dangerous environments. One set covers 2 Troopers.', mobility_cost: -1, reqcost: 0, max_uses: -1 },
]

export function gearByName(name: string): GearItem | undefined {
  return GEAR.find(g => g.name === name)
}

export function gearByType(type: GearItem['geartype']): GearItem[] {
  return GEAR.filter(g => g.geartype === type)
}

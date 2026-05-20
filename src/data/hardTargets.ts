import type { HardTarget } from '../types'

// SRD v0.97.0 ch. 07 — Hard Targets table. Strings match SRD wording.
export const HT_LABEL: Record<HardTarget['type'], string> = {
  brute: 'BRUTE',
  sniper: 'SNIPER',
  grenadier: 'GRENADIER',
  gun_nest: 'GUN NEST',
  tank: 'TANK',
}

export const HT_DAMAGE: Record<HardTarget['type'], string> = {
  brute: '−1 DEF to 2 Troopers',
  sniper: '−2 DEF to 1 Trooper',
  grenadier: '−2 DEF to 1 Trooper',
  gun_nest: '−1 DEF to 1 Trooper',
  tank: '−1 DEF to all Troopers',
}

export const HT_NOTES: Record<HardTarget['type'], string> = {
  brute: '',
  sniper: 'Prefers Flanked targets.',
  grenadier: 'Prefers Fortified targets.',
  gun_nest: 'Prefers Flanking targets.',
  tank: 'Mobile. Can appear during Engagement. Attacks every other Exchange.',
}

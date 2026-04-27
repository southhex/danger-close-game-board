# Mock data used in the V1 prototype

For parity when wiring up components against your real types.

## Mission

```ts
{
  name: 'OP. COLDWATER',
  sector: { name: 'Ridge 404', cover: 1, space: 1, tl: 3, weather: -1 },
  momentum: -1,           // -3..+3
  advance_rolls: 4,
  stealth: false,
}
```

`momentum` labels:

```ts
{
  '-3': 'DEFEAT',
  '-2': 'FALTERING',
  '-1': 'LOSING GROUND',
   '0': 'CONTESTED',
   '1': 'GAINING GROUND',
   '2': 'BREAKING THROUGH',
   '3': 'VICTORY',
}
```

## Squad (4 troopers — one of each status, plus the medic)

```ts
[
  {
    id: 'a', name: 'Vogel', callsign: 'SIX', status: 'ok',
    grit: 2, grit_max: 2, ammo: 3, ammo_max: 3, mobility: 4, eff_mob: 4,
    offpos: 'flanking', defpos: 'incover', suppressed: false, def_modifier: 0,
    armor: 'Plate Carrier', weapon: 'Assault Rifle',
    special_weapon: 'Grenade Launcher', sw_uses: 2, sw_max: 3,
    special_gear: 'Radio', tag: 'SQUAD LEADER', perks: ['Steady Aim'],
  },
  {
    id: 'b', name: 'Kessler', callsign: 'BEAR', status: 'grazed',
    grit: 1, grit_max: 3, ammo: 2, ammo_max: 3, mobility: 3, eff_mob: 3,
    offpos: 'engaged', defpos: 'incover', suppressed: true, def_modifier: -1,
    armor: 'Heavy Plate', weapon: 'LMG',
    special_weapon: 'Smoke', sw_uses: 1, sw_max: 2,
    special_gear: 'Drone', tag: 'HEAVY', perks: ['Suppressor', 'Drone Op'],
  },
  {
    id: 'c', name: 'Amari', callsign: 'FOX', status: 'wounded',
    grit: 0, grit_max: 2, ammo: 1, ammo_max: 3, mobility: 5, eff_mob: 4,
    offpos: 'engaged', defpos: 'flanked', suppressed: false, def_modifier: 0,
    armor: 'Light Armor', weapon: 'Carbine',
    special_weapon: 'Marksman Kit', sw_uses: 0, sw_max: 3,
    special_gear: 'Medkit', tag: 'SCOUT', perks: ['Light Foot'],
  },
  {
    id: 'd', name: 'Renner', callsign: 'DOC', status: 'bleedingout',
    grit: 0, grit_max: 2, ammo: 2, ammo_max: 3, mobility: 4, eff_mob: 3,
    offpos: 'limited', defpos: 'flanked', suppressed: false, def_modifier: -2,
    armor: 'Plate Carrier', weapon: 'Carbine',
    special_weapon: 'Stims', sw_uses: 2, sw_max: 3,
    special_gear: 'Medkit', tag: 'MEDIC', perks: ['Triage'],
  },
]
```

## Recent rolls (for the dice tray / log views)

```ts
[
  { id: '1', label: 'Advance',           dice: '2d6', results: [3,4], modifier: -2, total: 5, result: 'SPOTTED', time: '2m'  },
  { id: '2', label: 'Vogel — Mobility',  dice: '1d6', results: [2],   modifier:  0, total: 2, result: 'PASS',    time: '1m'  },
  { id: '3', label: 'Kessler — Mobility',dice: '1d6', results: [5],   modifier:  0, total: 5, result: 'FAIL',    time: '1m'  },
  { id: '4', label: 'Amari — Mobility',  dice: '1d6', results: [3],   modifier:  0, total: 3, result: 'PASS',    time: '1m'  },
  { id: '5', label: 'Renner — Mobility', dice: '1d6', results: [6],   modifier:  0, total: 6, result: 'FAIL',    time: 'now' },
]
```

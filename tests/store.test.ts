import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../src/store'

function resetStore() {
  // Clear localStorage if available (jsdom environment)
  if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
    localStorage.clear()
  }
  useStore.setState({
    troopers: [], mission: null, diceHistory: [],
    currentView: 'barracks', diceTrayOpen: false,
  })
}

describe('store', () => {
  beforeEach(resetStore)

  it('addTrooper assigns an id', () => {
    useStore.getState().addTrooper({
      name: 'Warden', fullname: '', callsign: '', active: true, perkpoints: 0,
      mobility: 4, armor: 'Medium Armor', weapon: 'Assault Rifle',
      special_weapon: '', special_gear: '', perk: '', notes: '',
      grit: 3, ammo: 3, status: 'ok', offpos: 'engaged', defpos: 'incover',
      suppressed: false, def_modifier: 0, special_weapon_uses: -1, special_gear_uses: -1,
    })
    const t = useStore.getState().troopers[0]
    expect(t.id).toBeTruthy()
    expect(t.name).toBe('Warden')
  })

  it('prepareMission resets active trooper mission-state', () => {
    useStore.setState({
      troopers: [{
        id: 'a', name: 'A', fullname: '', callsign: '', active: true, perkpoints: 0,
        mobility: 4, armor: 'Medium Armor', weapon: 'Assault Rifle',
        special_weapon: 'Rocket Launcher', special_gear: '', perk: '', notes: '',
        grit: 0, ammo: 0, status: 'wounded', offpos: 'limited', defpos: 'flanked',
        suppressed: true, def_modifier: -1, special_weapon_uses: 0, special_gear_uses: -1,
      }],
    })
    useStore.getState().prepareMission()
    const t = useStore.getState().troopers[0]
    expect(t.grit).toBe(3)
    expect(t.ammo).toBe(3)
    expect(t.status).toBe('ok')
    expect(t.special_weapon_uses).toBe(1) // Rocket Launcher max_uses = 1
  })

  it('applyAdvanceResult sets defpos and momentum', () => {
    useStore.setState({
      mission: { id: 'm', name: '', sector: { name: '', cover: 1, space: 1, tl: 2, weather: 0 }, momentum: 0, advance_rolls: 0, stealth: true, notes: '' },
      troopers: [{
        id: 'a', name: 'A', fullname: '', callsign: '', active: true, perkpoints: 0,
        mobility: 4, armor: '', weapon: '', special_weapon: '', special_gear: '',
        perk: '', notes: '', grit: 3, ammo: 3, status: 'ok', offpos: 'engaged',
        defpos: 'incover', suppressed: false, def_modifier: 0,
        special_weapon_uses: -1, special_gear_uses: -1,
      }],
    })
    useStore.getState().applyAdvanceResult({ result: 'ambushed', trooperOffpos: { a: 'limited' } })
    const s = useStore.getState()
    expect(s.troopers[0].defpos).toBe('flanked')
    expect(s.troopers[0].offpos).toBe('limited')
    expect(s.mission!.momentum).toBe(-1)
    expect(s.mission!.stealth).toBe(false)
    expect(s.mission!.advance_rolls).toBe(1)
  })

  it('addRoll caps history at 20', () => {
    for (let i = 0; i < 25; i++) {
      useStore.getState().addRoll({
        id: String(i), timestamp: i, label: 'r', dice: '1d6',
        results: [1], modifier: 0, total: 1,
      })
    }
    expect(useStore.getState().diceHistory).toHaveLength(20)
  })

  it('importState validates shape', () => {
    expect(() => useStore.getState().importState(null)).toThrow()
    expect(() => useStore.getState().importState({})).toThrow()
    useStore.getState().importState({ troopers: [], mission: null, diceHistory: [] })
    expect(useStore.getState().troopers).toEqual([])
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../src/store'
import type { Trooper } from '../src/types'

const TEST_SQUAD = 'sq-test'

function makeTrooper(overrides: Partial<Omit<Trooper, 'id'>> & { id: string }) {
  return {
    name: 'X', fullname: '', callsign: '', perkpoints: 0,
    mobility: 4, armor: '', weapon: '', special_weapon: '', special_gear: '',
    tag: '', perks: [], notes: '',
    squadId: TEST_SQUAD, recovering: false,
    grit: 3, grit_max: 3, ammo: 3, ammo_max: 3,
    status: 'ok' as const, offpos: 'engaged' as const, defpos: 'incover' as const,
    suppressed: false, def_modifier: 0,
    special_weapon_uses: -1, special_gear_uses: -1,
    ...overrides,
  }
}

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
      name: 'Warden', fullname: '', callsign: '', perkpoints: 0,
      mobility: 4, armor: 'Medium Armor', weapon: 'Assault Rifle',
      special_weapon: '', special_gear: '', tag: '', perks: [], notes: '',
      squadId: null, recovering: false,
      grit: 3, grit_max: 3, ammo: 3, ammo_max: 3,
      status: 'ok', offpos: 'engaged', defpos: 'incover',
      suppressed: false, def_modifier: 0, special_weapon_uses: -1, special_gear_uses: -1,
    })
    const t = useStore.getState().troopers[0]
    expect(t.id).toBeTruthy()
    expect(t.name).toBe('Warden')
  })

  it('resetMission resets active trooper mission-state', () => {
    useStore.setState({
      troopers: [makeTrooper({
        id: 'a', name: 'A', armor: 'Medium Armor', weapon: 'Assault Rifle',
        special_weapon: 'Rocket Launcher',
        grit: 0, ammo: 0, status: 'wounded', offpos: 'limited', defpos: 'flanked',
        suppressed: true, def_modifier: -1, special_weapon_uses: 0,
      })],
      mission: {
        id: 'm', name: '',
        sectors: [{ id: 's1', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }],
        activeSectorId: 's1', phase: 'advance', engagement: null,
        momentum: 0, advance_rolls: 0, stealth: false, notes: '',
        transitionFromSectorId: null, squadId: TEST_SQUAD,
      },
    })
    useStore.getState().resetMission()
    const t = useStore.getState().troopers[0]
    expect(t.grit).toBe(3)
    expect(t.ammo).toBe(3)
    expect(t.status).toBe('ok')
    expect(t.special_weapon_uses).toBe(1) // Rocket Launcher max_uses = 1
  })

  it('applyAdvanceResult sets defpos and momentum', () => {
    useStore.setState({
      mission: {
        id: 'm', name: '',
        sectors: [{ id: 's1', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }],
        activeSectorId: 's1', phase: 'advance', engagement: null,
        momentum: 0, advance_rolls: 0, stealth: true, notes: '',
        transitionFromSectorId: null, squadId: TEST_SQUAD,
      },
      troopers: [makeTrooper({ id: 'a', name: 'A' })],
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

  // ── New engagement-flow actions ──────────────────────────────────────────────

  it('addSector appends with pending status', () => {
    useStore.setState({
      mission: {
        id: 'm', name: '', sectors: [], activeSectorId: '',
        phase: 'advance', engagement: null, momentum: 0, advance_rolls: 0, stealth: false, notes: '',
      },
    })
    useStore.getState().addSector({ name: 'Bravo', cover: 1, space: 1, tl: 2, weather: 0 })
    const { sectors } = useStore.getState().mission!
    expect(sectors).toHaveLength(1)
    expect(sectors[0].status).toBe('pending')
    expect(sectors[0].name).toBe('Bravo')
    expect(sectors[0].id).toBeTruthy()
  })

  it('beginEngagement creates EngagementState and sets phase', () => {
    useStore.setState({
      mission: {
        id: 'm', name: '',
        sectors: [{ id: 's1', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }],
        activeSectorId: 's1', phase: 'advance', engagement: null,
        momentum: 0, advance_rolls: 0, stealth: false, notes: '',
      },
    })
    useStore.getState().beginEngagement()
    const { mission } = useStore.getState()
    expect(mission!.phase).toBe('engagement')
    expect(mission!.engagement).not.toBeNull()
    expect(mission!.engagement!.exchangeNumber).toBe(1)
    expect(mission!.engagement!.step).toBe('intent')
    expect(mission!.engagement!.pressure).toBe(0)
    expect(mission!.engagement!.hardTargets).toEqual([])
    expect(mission!.engagement!.attachedForces).toEqual([])
    expect(mission!.engagement!.offenseResult).toBeNull()
    expect(mission!.engagement!.pendingTactic).toBeNull()
    expect(mission!.engagement!.nextExchangeModifiers.atkPenalty).toBe(0)
    expect(mission!.engagement!.tankActsThisExchange).toBe(false)
  })

  it('resolveDefenseRoll with injury advances trooper status', () => {
    useStore.setState({
      troopers: [makeTrooper({ id: 't1', status: 'ok' })],
      mission: {
        id: 'm', name: '',
        sectors: [{ id: 's1', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }],
        activeSectorId: 's1', phase: 'engagement',
        engagement: {
          exchangeNumber: 1, step: 'defense', pressure: 0, hardTargets: [], attachedForces: [],
          intents: {}, offenseResult: null, defenseResults: {}, pendingTactic: null,
          radioStrikeCountdown: null,
          nextExchangeModifiers: { atkPenalty: 0, flankingDefPenalty: [], mustMove: [], flankedMustFallBack: [] },
          momentumGainedLastExchange: false, trooperDiedLastExchange: false,
          trooperMovedLastExchange: {}, tankActsThisExchange: false,
        },
        momentum: 0, advance_rolls: 0, stealth: false, notes: '',
      },
    })
    // 1 injury: ok → grazed
    useStore.getState().resolveDefenseRoll('t1', { roll: 2, outcome: 'direct_fire', resolution: 'injury', injuryCount: 1 })
    expect(useStore.getState().troopers[0].status).toBe('grazed')
    // 2 injuries: grazed → wounded → bleedingout
    useStore.getState().resolveDefenseRoll('t1', { roll: 1, outcome: 'direct_fire', resolution: 'injury', injuryCount: 2 })
    expect(useStore.getState().troopers[0].status).toBe('bleedingout')
    // injury on bleedingout stays bleedingout
    useStore.getState().resolveDefenseRoll('t1', { roll: 1, outcome: 'direct_fire', resolution: 'injury', injuryCount: 1 })
    expect(useStore.getState().troopers[0].status).toBe('bleedingout')
  })

  it('advanceToNextSector activates next sector and resets advance_rolls', () => {
    useStore.setState({
      troopers: [makeTrooper({ id: 'a', suppressed: true, def_modifier: -2 })],
      mission: {
        id: 'm', name: '',
        sectors: [
          { id: 's1', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' },
          { id: 's2', name: 'Bravo', cover: 2, space: 2, tl: 3, weather: 0, status: 'pending' },
        ],
        activeSectorId: 's1', phase: 'catch_breath',
        engagement: null, momentum: 1, advance_rolls: 4, stealth: false, notes: '',
        transitionFromSectorId: null, squadId: TEST_SQUAD,
      },
    })
    useStore.getState().advanceToNextSector()
    const s = useStore.getState()
    expect(s.mission!.activeSectorId).toBe('s2')
    expect(s.mission!.advance_rolls).toBe(0)
    expect(s.mission!.phase).toBe('advance')
    expect(s.mission!.sectors.find(sec => sec.id === 's1')!.status).toBe('cleared')
    expect(s.mission!.sectors.find(sec => sec.id === 's2')!.status).toBe('active')
    // Trooper suppressed reset, def_modifier reset
    expect(s.troopers[0].suppressed).toBe(false)
    expect(s.troopers[0].def_modifier).toBe(0)
    // Grit/ammo/status untouched
    expect(s.troopers[0].grit).toBe(3)
    expect(s.troopers[0].status).toBe('ok')
  })

  it('endEngagement sets phase to catch_breath and keeps engagement data', () => {
    useStore.setState({
      mission: {
        id: 'm', name: '',
        sectors: [{ id: 's1', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }],
        activeSectorId: 's1', phase: 'engagement',
        engagement: {
          exchangeNumber: 3, step: 'enemy_tactics', pressure: 2, hardTargets: [], attachedForces: [],
          intents: {}, offenseResult: null, defenseResults: {}, pendingTactic: null,
          radioStrikeCountdown: 1,
          nextExchangeModifiers: { atkPenalty: 0, flankingDefPenalty: [], mustMove: [], flankedMustFallBack: [] },
          momentumGainedLastExchange: true, trooperDiedLastExchange: false,
          trooperMovedLastExchange: {}, tankActsThisExchange: false,
        },
        momentum: 2, advance_rolls: 1, stealth: false, notes: '',
        transitionFromSectorId: null,
      },
    })
    useStore.getState().endEngagement('victory')
    const { mission } = useStore.getState()
    expect(mission!.phase).toBe('catch_breath')
    // Engagement state preserved (CatchBreathPanel may need radioStrikeCountdown)
    expect(mission!.engagement).not.toBeNull()
    expect(mission!.engagement!.exchangeNumber).toBe(3)
    expect(mission!.engagement!.radioStrikeCountdown).toBe(1)
    // Victory marks the active sector cleared
    expect(mission!.sectors.find(s => s.id === 's1')!.status).toBe('cleared')
  })

  // ── nullifyTactic — SRD ch.06: Sergeant only, not BO/Suppressed, grit ≥ 1 ──
  function setupTacticNullify(opts: { sergeantId: string | null; trooperOverrides?: Partial<Trooper> } = { sergeantId: 'sgt' }) {
    useStore.setState({
      currentCampaignId: 'c1',
      campaigns: [{ id: 'c1', name: 'C', description: '', created_at: '', req: 0, reqEnabled: false, defaultAirspace: 'contested' }],
      authStatus: 'authenticated',
      user: { username: 'u' },
      squads: [{ id: TEST_SQUAD, campaignId: 'c1', name: 'S', callsign: '', sergeantId: opts.sergeantId, perks: [], notes: '' }],
      troopers: [
        makeTrooper({ id: 'sgt', grit: 2, ...opts.trooperOverrides }),
        makeTrooper({ id: 'pvt', grit: 3 }),
      ],
      mission: {
        id: 'm', name: '',
        sectors: [{ id: 's1', name: 'A', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }],
        activeSectorId: 's1', phase: 'engagement',
        engagement: {
          exchangeNumber: 1, step: 'enemy_tactics', pressure: 0, hardTargets: [], attachedForces: [],
          intents: {}, offenseResult: null, defenseResults: {}, pendingTactic: 'scatter',
          radioStrikeCountdown: null,
          nextExchangeModifiers: { atkPenalty: 0, flankingDefPenalty: [], mustMove: [], flankedMustFallBack: [] },
          momentumGainedLastExchange: false, trooperDiedLastExchange: false,
          trooperMovedLastExchange: {}, tankActsThisExchange: false,
        },
        momentum: 0, advance_rolls: 0, stealth: false, notes: '',
        transitionFromSectorId: null, squadId: TEST_SQUAD,
      },
    })
  }

  it('nullifyTactic allows Sergeant to clear pendingTactic and spends 1 grit', () => {
    setupTacticNullify()
    useStore.getState().nullifyTactic('sgt')
    const s = useStore.getState()
    expect(s.troopers.find(t => t.id === 'sgt')!.grit).toBe(1)
    expect(s.mission!.engagement!.pendingTactic).toBeNull()
  })

  it('nullifyTactic rejects non-Sergeant trooper (no grit spent, tactic stays)', () => {
    setupTacticNullify()
    useStore.getState().nullifyTactic('pvt')
    const s = useStore.getState()
    expect(s.troopers.find(t => t.id === 'pvt')!.grit).toBe(3)
    expect(s.mission!.engagement!.pendingTactic).toBe('scatter')
  })

  it('nullifyTactic rejects when Sergeant is Suppressed', () => {
    setupTacticNullify({ sergeantId: 'sgt', trooperOverrides: { suppressed: true } })
    useStore.getState().nullifyTactic('sgt')
    const s = useStore.getState()
    expect(s.troopers.find(t => t.id === 'sgt')!.grit).toBe(2)
    expect(s.mission!.engagement!.pendingTactic).toBe('scatter')
  })

  it('nullifyTactic rejects when Sergeant is Bleeding Out', () => {
    setupTacticNullify({ sergeantId: 'sgt', trooperOverrides: { status: 'bleedingout' } })
    useStore.getState().nullifyTactic('sgt')
    const s = useStore.getState()
    expect(s.troopers.find(t => t.id === 'sgt')!.grit).toBe(2)
    expect(s.mission!.engagement!.pendingTactic).toBe('scatter')
  })

  it('nullifyTactic rejects when Sergeant has 0 grit', () => {
    setupTacticNullify({ sergeantId: 'sgt', trooperOverrides: { grit: 0 } })
    useStore.getState().nullifyTactic('sgt')
    const s = useStore.getState()
    expect(s.troopers.find(t => t.id === 'sgt')!.grit).toBe(0)
    expect(s.mission!.engagement!.pendingTactic).toBe('scatter')
  })

  it('nullifyTactic rejects when squad has no sergeant assigned', () => {
    setupTacticNullify({ sergeantId: null })
    useStore.getState().nullifyTactic('sgt')
    const s = useStore.getState()
    expect(s.troopers.find(t => t.id === 'sgt')!.grit).toBe(2)
    expect(s.mission!.engagement!.pendingTactic).toBe('scatter')
  })
})

describe('mission progression', () => {
  beforeEach(() => { resetStore() })

  function setupTwoSectors(activePhase: 'advance' | 'engagement' | 'catch_breath' = 'advance') {
    useStore.setState({
      troopers: [makeTrooper({ id: 't1', mobility: 4, suppressed: true, def_modifier: -2 })],
      mission: {
        id: 'm', name: 'M',
        sectors: [
          { id: 'a', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' },
          { id: 'b', name: 'Bravo', cover: 1, space: 1, tl: 2, weather: 0, status: 'pending' },
        ],
        activeSectorId: 'a',
        phase: activePhase, engagement: null,
        momentum: 0, advance_rolls: 2, stealth: false, notes: '',
        transitionFromSectorId: null, squadId: TEST_SQUAD,
      },
    })
  }

  it('overwhelmActiveSector clears current and advances to next pending', () => {
    setupTwoSectors()
    useStore.getState().overwhelmActiveSector()
    const m = useStore.getState().mission!
    expect(m.activeSectorId).toBe('b')
    expect(m.sectors.find(s => s.id === 'a')!.status).toBe('cleared')
    expect(m.sectors.find(s => s.id === 'b')!.status).toBe('active')
    expect(m.phase).toBe('advance')
    expect(m.advance_rolls).toBe(0)
    expect(m.transitionFromSectorId).toBe('a')
  })

  it('bypassActiveSector clears current and advances (same as overwhelm)', () => {
    setupTwoSectors()
    useStore.getState().bypassActiveSector()
    const m = useStore.getState().mission!
    expect(m.activeSectorId).toBe('b')
    expect(m.sectors.find(s => s.id === 'a')!.status).toBe('cleared')
    expect(m.phase).toBe('advance')
    expect(m.transitionFromSectorId).toBe('a')
  })

  it('clearAndAdvance with no next pending sector lands in catch_breath', () => {
    useStore.setState({
      troopers: [makeTrooper({ id: 't1', mobility: 4 })],
      mission: {
        id: 'm', name: 'M',
        sectors: [
          { id: 'a', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' },
        ],
        activeSectorId: 'a',
        phase: 'advance', engagement: null,
        momentum: 0, advance_rolls: 1, stealth: false, notes: '',
        transitionFromSectorId: null,
      },
    })
    useStore.getState().overwhelmActiveSector()
    const m = useStore.getState().mission!
    expect(m.phase).toBe('catch_breath')
    expect(m.sectors.find(s => s.id === 'a')!.status).toBe('cleared')
    expect(m.transitionFromSectorId).toBeNull()
    expect(m.advance_rolls).toBe(0)
  })

  it('endEngagement(defeat) does not mark sector cleared', () => {
    setupTwoSectors('engagement')
    useStore.getState().endEngagement('defeat')
    const m = useStore.getState().mission!
    expect(m.phase).toBe('catch_breath')
    expect(m.sectors.find(s => s.id === 'a')!.status).toBe('active')
  })

  it('endEngagement(disengage) does not mark sector cleared', () => {
    setupTwoSectors('engagement')
    useStore.getState().endEngagement('disengage')
    const m = useStore.getState().mission!
    expect(m.phase).toBe('catch_breath')
    expect(m.sectors.find(s => s.id === 'a')!.status).toBe('active')
  })

  it('endMission transitions to mission_complete and clears engagement', () => {
    setupTwoSectors('catch_breath')
    useStore.getState().endMission()
    const m = useStore.getState().mission!
    expect(m.phase).toBe('mission_complete')
    expect(m.engagement).toBeNull()
  })

  it('setActiveSector ignores cleared targets', () => {
    useStore.setState({
      mission: {
        id: 'm', name: 'M',
        sectors: [
          { id: 'a', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'cleared' },
          { id: 'b', name: 'Bravo', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' },
        ],
        activeSectorId: 'b',
        phase: 'advance', engagement: null,
        momentum: 0, advance_rolls: 0, stealth: false, notes: '',
        transitionFromSectorId: null,
      },
    })
    useStore.getState().setActiveSector('a')
    const m = useStore.getState().mission!
    expect(m.activeSectorId).toBe('b')
    expect(m.sectors.find(s => s.id === 'a')!.status).toBe('cleared')
    expect(m.sectors.find(s => s.id === 'b')!.status).toBe('active')
  })

  it('clearAndAdvance refreshes Jump Pack uses and clears suppressed/def_modifier', () => {
    useStore.setState({
      troopers: [makeTrooper({
        id: 't1', mobility: 4, special_gear: 'Jump Pack',
        special_gear_uses: 0, suppressed: true, def_modifier: -1,
      })],
      mission: {
        id: 'm', name: 'M',
        sectors: [
          { id: 'a', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' },
          { id: 'b', name: 'Bravo', cover: 1, space: 1, tl: 2, weather: 0, status: 'pending' },
        ],
        activeSectorId: 'a',
        phase: 'advance', engagement: null,
        momentum: 0, advance_rolls: 0, stealth: false, notes: '',
        transitionFromSectorId: null, squadId: TEST_SQUAD,
      },
    })
    useStore.getState().bypassActiveSector()
    const t = useStore.getState().troopers[0]
    expect(t.suppressed).toBe(false)
    expect(t.def_modifier).toBe(0)
    expect(t.special_gear_uses).toBeGreaterThan(0)
  })
})

describe('sector transition state', () => {
  beforeEach(() => { resetStore() })

  it('advanceToNextSector sets transitionFromSectorId to the leaving sector', () => {
    useStore.setState({
      troopers: [makeTrooper({ id: 't1', mobility: 4 })],
      mission: {
        id: 'm', name: 'M',
        sectors: [
          { id: 'a', name: 'A', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' },
          { id: 'b', name: 'B', cover: 1, space: 1, tl: 2, weather: 0, status: 'pending' },
        ],
        activeSectorId: 'a',
        phase: 'catch_breath', engagement: null,
        momentum: 0, advance_rolls: 0, stealth: false, notes: '',
        transitionFromSectorId: null,
      },
    })

    useStore.getState().advanceToNextSector()

    const m = useStore.getState().mission!
    expect(m.activeSectorId).toBe('b')
    expect(m.transitionFromSectorId).toBe('a')
    expect(m.sectors.find(s => s.id === 'a')!.status).toBe('cleared')
  })

  it('clearTransition resets the flag', () => {
    useStore.setState({
      mission: {
        id: 'm', name: 'M',
        sectors: [{ id: 'a', name: 'A', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }],
        activeSectorId: 'a',
        phase: 'advance', engagement: null,
        momentum: 0, advance_rolls: 0, stealth: false, notes: '',
        transitionFromSectorId: 'previous',
      },
    })

    useStore.getState().clearTransition()
    expect(useStore.getState().mission!.transitionFromSectorId).toBeNull()
  })
})

describe('Stage 7: DetermineSector mutators', () => {
  beforeEach(() => { resetStore() })

  const makeMission = (sectorOverrides: Partial<import('../src/types').MissionSector> = {}) => ({
    id: 'm', name: 'M',
    sectors: [{
      id: 's1', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0,
      status: 'active' as const, contentsState: 'undetermined' as const,
      ...sectorOverrides,
    }],
    activeSectorId: 's1',
    phase: 'determine_sector' as const,
    engagement: null, momentum: 0, advance_rolls: 0, stealth: false, notes: '',
    transitionFromSectorId: null, squadId: TEST_SQUAD,
  })

  it('applySectorRoll writes cover/space/tl/weather and transitions to advance', () => {
    useStore.setState({ mission: makeMission() })
    useStore.getState().applySectorRoll('s1', { cover: 2, space: 0, tl: 3, weather: -1 })
    const m = useStore.getState().mission!
    expect(m.phase).toBe('advance')
    const s = m.sectors[0]
    expect(s.cover).toBe(2)
    expect(s.space).toBe(0)
    expect(s.tl).toBe(3)
    expect(s.weather).toBe(-1)
    expect(s.contentsState).toBe('rolled')
  })

  it('applySectorEmpty marks sector cleared+empty and transitions to catch_breath', () => {
    useStore.setState({ mission: makeMission() })
    useStore.getState().applySectorEmpty('s1')
    const m = useStore.getState().mission!
    expect(m.phase).toBe('catch_breath')
    const s = m.sectors[0]
    expect(s.status).toBe('cleared')
    expect(s.empty).toBe(true)
    expect(s.contentsState).toBe('rolled')
  })

  it('applySectorBoon marks sector cleared with boon and transitions to catch_breath', () => {
    useStore.setState({ mission: makeMission() })
    useStore.getState().applySectorBoon('s1', { type: 'ammo_cache' })
    const m = useStore.getState().mission!
    expect(m.phase).toBe('catch_breath')
    const s = m.sectors[0]
    expect(s.status).toBe('cleared')
    expect(s.boon?.type).toBe('ammo_cache')
  })

  it('applyAmmoCache increments ammo capped at ammo_max', () => {
    useStore.setState({
      troopers: [makeTrooper({ id: 'a', ammo: 3, ammo_max: 3 }), makeTrooper({ id: 'b', ammo: 1, ammo_max: 3 })],
      mission: { ...makeMission(), squadId: TEST_SQUAD },
    })
    useStore.getState().applyAmmoCache()
    const ts = useStore.getState().troopers
    expect(ts.find(t => t.id === 'a')!.ammo).toBe(3) // already capped
    expect(ts.find(t => t.id === 'b')!.ammo).toBe(2) // +1
  })

  it('applyEnemyIntel sets nextAdvanceBonus to 1', () => {
    useStore.setState({ mission: makeMission() })
    useStore.getState().applyEnemyIntel()
    expect(useStore.getState().mission!.nextAdvanceBonus).toBe(1)
  })

  it('applyRookies queues an attached force on pendingAttachedForces', () => {
    useStore.setState({ mission: makeMission() })
    useStore.getState().applyRookies()
    const m = useStore.getState().mission!
    expect(m.pendingAttachedForces).toHaveLength(1)
    expect(m.pendingAttachedForces![0].name).toBe('Rookies')
    expect(m.pendingAttachedForces![0].dice).toBe(2)
  })

  it('beginEngagement transfers pendingAttachedForces to engagement and clears them', () => {
    const rookies = { id: 'r1', name: 'Rookies', dice: 2, isVip: false, committed: false }
    useStore.setState({
      mission: { ...makeMission(), phase: 'advance', pendingAttachedForces: [rookies] },
    })
    useStore.getState().beginEngagement()
    const m = useStore.getState().mission!
    expect(m.engagement!.attachedForces).toHaveLength(1)
    expect(m.engagement!.attachedForces[0].name).toBe('Rookies')
    expect(m.pendingAttachedForces).toHaveLength(0)
  })

  it('setActiveSector sets determine_sector phase for undetermined sector', () => {
    useStore.setState({
      mission: {
        ...makeMission({ contentsState: 'undetermined', status: 'pending' }),
        sectors: [
          { id: 's0', name: 'LZ', cover: 1, space: 1, tl: 1, weather: 0, status: 'active', contentsState: 'predetermined' },
          { id: 's1', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'pending', contentsState: 'undetermined' },
        ],
        activeSectorId: 's0',
        phase: 'catch_breath',
      },
    })
    useStore.getState().setActiveSector('s1')
    expect(useStore.getState().mission!.phase).toBe('determine_sector')
  })

  it('reactivateSector with resetContents sets status=pending and contentsState=undetermined', () => {
    useStore.setState({
      mission: { ...makeMission({ status: 'cleared', contentsState: 'rolled', empty: true }) },
    })
    useStore.getState().reactivateSector('s1', true)
    const s = useStore.getState().mission!.sectors[0]
    expect(s.status).toBe('pending')
    expect(s.contentsState).toBe('undetermined')
    expect(s.empty).toBeUndefined()
  })

  it('reactivateSector keeping contents marks one-shot boon as consumed', () => {
    useStore.setState({
      mission: {
        ...makeMission({
          status: 'cleared', contentsState: 'rolled',
          boon: { type: 'ammo_cache' },
        }),
      },
    })
    useStore.getState().reactivateSector('s1', false)
    const s = useStore.getState().mission!.sectors[0]
    expect(s.status).toBe('pending')
    expect(s.boon?.consumed).toBe(true)
  })
})

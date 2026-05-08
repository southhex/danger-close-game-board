import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mission, Squad, MissionState } from '../src/types'

vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client')>('../src/api/client')
  return {
    ...actual,
    apiFetch: vi.fn(),
    createSquadApi: vi.fn(async (campaignId: string, input: Omit<Squad, 'id' | 'campaignId' | 'created_at'>) => ({
      id: 'sq-new',
      campaignId,
      name: input.name,
      callsign: input.callsign,
      sergeantId: input.sergeantId,
      perks: input.perks,
      notes: input.notes,
    } as Squad)),
    patchSquadApi: vi.fn(async (squad: Squad) => squad),
    deleteSquadApi: vi.fn(async () => undefined),
    createMissionApi: vi.fn(async (campaignId: string, input: Omit<Mission, 'id' | 'campaignId' | 'status' | 'created_at' | 'completed_at'>) => ({
      id: 'm-new',
      campaignId,
      status: 'blueprint' as const,
      name: input.name,
    })),
    patchMissionBlueprintApi: vi.fn(async (mission: Mission) => mission),
    deleteMissionApi: vi.fn(async () => undefined),
    deployMissionApi: vi.fn(async (missionId: string, squadId: string): Promise<Mission> => ({
      id: missionId,
      campaignId: 'c1',
      status: 'live',
      name: 'Op',
      squadId,
      sectors: [{ id: 's1', name: 'Sector Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'pending' }],
    })),
    completeMissionApi: vi.fn(async (missionId: string) => ({
      mission: { id: missionId, campaignId: 'c1', status: 'completed' as const, name: 'Op' },
      reqAwarded: 2,
      campaignReq: 5,
      recoveringIds: ['t2'],
    })),
    patchReqApi: vi.fn(async (id: string, req: number) => ({ id, req })),
    spendReqApi: vi.fn(async (id: string, body: { amount: number; trooperId: string; gearChange: { slot: string; name: string | null } }) => ({
      id,
      req: 7,
      trooper: { id: body.trooperId, data: {} },
    })),
    patchCampaignSettingsApi: vi.fn(async () => undefined),
  }
})

import { useStore } from '../src/store'
import * as api from '../src/api/client'

function resetStore() {
  if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
    localStorage.clear()
  }
  useStore.setState({
    troopers: [], mission: null, diceHistory: [],
    squads: [], missions: [],
    currentCampaignId: 'c1',
    campaigns: [{ id: 'c1', name: 'Camp', description: '', created_at: '', req: 10, reqEnabled: true, defaultAirspace: 'contested' }],
    authStatus: 'authenticated',
    user: { username: 'u' },
    currentView: 'barracks', diceTrayOpen: false,
  })
}

describe('store stage 2 mutators', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  it('createSquad adds to state and POSTs', async () => {
    const result = await useStore.getState().createSquad({ name: 'Alpha', callsign: 'AL' })
    expect(result?.name).toBe('Alpha')
    expect(api.createSquadApi).toHaveBeenCalledOnce()
    expect(useStore.getState().squads).toHaveLength(1)
    expect(useStore.getState().squads[0].name).toBe('Alpha')
  })

  it('assignTrooperToSquad updates trooper.squadId', () => {
    useStore.setState({
      troopers: [{
        id: 't1', name: 'A', fullname: '', callsign: '',
        perkpoints: 0, mobility: 4, armor: '', weapon: '', special_weapon: '', special_gear: '',
        tag: '', perks: [], notes: '', squadId: null, recovering: false,
        grit: 3, grit_max: 3, ammo: 3, ammo_max: 3,
        status: 'ok', offpos: 'engaged', defpos: 'incover',
        suppressed: false, def_modifier: 0, special_weapon_uses: -1, special_gear_uses: -1,
      }],
    })
    useStore.getState().assignTrooperToSquad('t1', 'sq-a')
    expect(useStore.getState().troopers[0].squadId).toBe('sq-a')
  })

  it('deployMission flips status and sets currentMissionId', async () => {
    useStore.setState({
      missions: [{ id: 'm1', campaignId: 'c1', status: 'blueprint', name: 'Op' }],
    })
    await useStore.getState().deployMission('m1', 'sq1')
    const m = useStore.getState().missions.find(x => x.id === 'm1')!
    expect(m.status).toBe('live')
    expect(m.squadId).toBe('sq1')
    const c = useStore.getState().campaigns.find(x => x.id === 'c1')!
    expect(c.currentMissionId).toBe('m1')
    expect(api.deployMissionApi).toHaveBeenCalledWith('m1', 'sq1')
  })

  it('completeMission updates mission status and clears currentMissionId', async () => {
    useStore.setState({
      missions: [{ id: 'm1', campaignId: 'c1', status: 'live', name: 'Op', squadId: 'sq1' }],
      campaigns: [{ id: 'c1', name: 'Camp', description: '', created_at: '', req: 3, reqEnabled: true, currentMissionId: 'm1' }],
    })
    await useStore.getState().completeMission('m1', { fieldReport: 'good', outcome: 'victory' })
    const m = useStore.getState().missions.find(x => x.id === 'm1')!
    expect(m.status).toBe('completed')
    const c = useStore.getState().campaigns.find(x => x.id === 'c1')!
    expect(c.currentMissionId).toBeNull()
    expect(c.req).toBe(5)
  })

  it('createMission adds blueprint to local missions', async () => {
    const result = await useStore.getState().createMission({ name: 'Recon Op' })
    expect(result?.id).toBe('m-new')
    expect(useStore.getState().missions).toHaveLength(1)
    expect(api.createMissionApi).toHaveBeenCalledOnce()
  })

  it('deleteSquad removes squad and clears trooper.squadId', async () => {
    useStore.setState({
      squads: [{ id: 'sq1', campaignId: 'c1', name: 'Alpha', callsign: '', sergeantId: null, perks: [], notes: '' }],
      troopers: [{
        id: 't1', name: 'A', fullname: '', callsign: '',
        perkpoints: 0, mobility: 4, armor: '', weapon: '', special_weapon: '', special_gear: '',
        tag: '', perks: [], notes: '', squadId: 'sq1', recovering: false,
        grit: 3, grit_max: 3, ammo: 3, ammo_max: 3,
        status: 'ok', offpos: 'engaged', defpos: 'incover',
        suppressed: false, def_modifier: 0, special_weapon_uses: -1, special_gear_uses: -1,
      }],
    })
    await useStore.getState().deleteSquad('sq1')
    expect(useStore.getState().squads).toHaveLength(0)
    expect(useStore.getState().troopers[0].squadId).toBeNull()
  })

  it('spendReq rejects when REQ insufficient', async () => {
    useStore.setState({
      campaigns: [{ id: 'c1', name: 'Camp', description: '', created_at: '', req: 1, reqEnabled: true }],
    })
    await expect(
      useStore.getState().spendReq(5, 't1', { slot: 'weapon', name: 'Sniper Rifle' }),
    ).rejects.toThrow(/Insufficient/)
    expect(api.spendReqApi).not.toHaveBeenCalled()
  })

  it('completeMission applies recovering flags and grit refill to deployed survivors', async () => {
    const t = (id: string, opts: { status: string; grit_max: number; squadId: string | null }) => ({
      id, name: 'A', fullname: '', callsign: '',
      perkpoints: 0, mobility: 4, armor: '', weapon: '', special_weapon: '', special_gear: '',
      tag: '', perks: [], notes: '', squadId: opts.squadId, recovering: false, wasBleedingOut: false,
      grit: 1, grit_max: opts.grit_max, ammo: 3, ammo_max: 3,
      status: opts.status, offpos: 'engaged' as const, defpos: 'incover' as const,
      suppressed: false, def_modifier: 0, special_weapon_uses: -1, special_gear_uses: -1,
    })
    const liveMission = {
      id: 'm1', name: 'Op',
      sectors: [{ id: 's1', name: 'Alpha', cover: 1 as const, space: 1 as const, tl: 2 as const, weather: 0 as const, status: 'active' as const }],
      activeSectorId: 's1', phase: 'catch_breath' as const, engagement: null,
      momentum: 1, advance_rolls: 1, stealth: false, notes: '',
      transitionFromSectorId: null, squadId: 'sq1',
    }
    useStore.setState({
      missions: [{ id: 'm1', campaignId: 'c1', status: 'live' as const, name: 'Op', squadId: 'sq1' }],
      campaigns: [{ id: 'c1', name: 'Camp', description: '', created_at: '', req: 3, reqEnabled: true, currentMissionId: 'm1' }],
      mission: liveMission,
      troopers: [
        t('t1', { status: 'ok', grit_max: 2, squadId: 'sq1' }),
        t('t2', { status: 'wounded', grit_max: 3, squadId: 'sq1' }),  // will be recovering
        t('t3', { status: 'dead', grit_max: 3, squadId: 'sq1' }),
        t('t4', { status: 'ok', grit_max: 2, squadId: null }),         // different squad, skipped
      ],
    })
    await useStore.getState().completeMission('m1', { fieldReport: 'test', outcome: 'victory' })
    const state = useStore.getState()
    const t1 = state.troopers.find(x => x.id === 't1')!
    const t2 = state.troopers.find(x => x.id === 't2')!
    const t3 = state.troopers.find(x => x.id === 't3')!
    const t4 = state.troopers.find(x => x.id === 't4')!
    // t1: ok survivor — grit refilled to min(grit_max+1, 3) = min(3,3) = 3
    expect(t1.grit).toBe(3)
    expect(t1.recovering).toBe(false)
    // t2: in recoveringIds from mock → recovering=true, grit refilled
    expect(t2.recovering).toBe(true)
    expect(t2.grit).toBe(3)   // min(3+1,3) = 3
    // t3: dead — not touched
    expect(t3.grit).toBe(1)
    // t4: not in squad — not touched
    expect(t4.grit).toBe(1)
  })

  it('deployMission auto-clears recovering for troopers not in the deploying squad', async () => {
    const t = (id: string, opts: { squadId: string | null; recovering: boolean }) => ({
      id, name: 'A', fullname: '', callsign: '',
      perkpoints: 0, mobility: 4, armor: '', weapon: '', special_weapon: '', special_gear: '',
      tag: '', perks: [], notes: '', squadId: opts.squadId, recovering: opts.recovering, wasBleedingOut: false,
      grit: 3, grit_max: 3, ammo: 3, ammo_max: 3,
      status: 'ok', offpos: 'engaged' as const, defpos: 'incover' as const,
      suppressed: false, def_modifier: 0, special_weapon_uses: -1, special_gear_uses: -1,
    })
    useStore.setState({
      missions: [{ id: 'm1', campaignId: 'c1', status: 'blueprint' as const, name: 'Op' }],
      troopers: [
        t('t1', { squadId: 'sq1', recovering: false }),  // in deploy squad
        t('t2', { squadId: 'sq2', recovering: true }),   // other squad — should auto-clear
        t('t3', { squadId: null,  recovering: true }),   // unassigned — should auto-clear
      ],
    })
    await useStore.getState().deployMission('m1', 'sq1')
    const state = useStore.getState()
    expect(state.troopers.find(x => x.id === 't1')!.recovering).toBe(false)  // reset by deploy
    expect(state.troopers.find(x => x.id === 't2')!.recovering).toBe(false)  // auto-cleared
    expect(state.troopers.find(x => x.id === 't3')!.recovering).toBe(false)  // auto-cleared
  })

  it('setCampaignAirspace PATCHes and updates local campaign', async () => {
    await useStore.getState().setCampaignAirspace('friendly')
    expect(api.patchCampaignSettingsApi).toHaveBeenCalledWith('c1', { defaultAirspace: 'friendly' })
    const c = useStore.getState().campaigns.find(x => x.id === 'c1')!
    expect(c.defaultAirspace).toBe('friendly')
  })

  it('setCampaignReqEnabled PATCHes and updates local campaign', async () => {
    await useStore.getState().setCampaignReqEnabled(false)
    expect(api.patchCampaignSettingsApi).toHaveBeenCalledWith('c1', { reqEnabled: false })
    const c = useStore.getState().campaigns.find(x => x.id === 'c1')!
    expect(c.reqEnabled).toBe(false)
  })

  // ── Test A: deployMission sets state.mission ──────────────────────────────

  it('deployMission sets state.mission with correct squadId and phase', async () => {
    useStore.setState({
      missions: [{ id: 'm1', campaignId: 'c1', status: 'blueprint', name: 'Op' }],
      troopers: [{
        id: 't1', name: 'A', fullname: '', callsign: '',
        perkpoints: 0, mobility: 4, armor: '', weapon: '', special_weapon: '', special_gear: '',
        tag: '', perks: [], notes: '', squadId: 'sq1', recovering: false,
        grit: 1, grit_max: 3, ammo: 1, ammo_max: 3,
        status: 'wounded', offpos: 'limited', defpos: 'flanked',
        suppressed: true, def_modifier: -1, special_weapon_uses: -1, special_gear_uses: -1,
      }],
    })
    await useStore.getState().deployMission('m1', 'sq1')
    const s = useStore.getState()
    expect(s.mission).not.toBeNull()
    expect(s.mission!.squadId).toBe('sq1')
    expect(s.mission!.phase).toBe('advance')
    expect(s.mission!.sectors.length).toBe(1)
    // Troopers in the squad were reset
    expect(s.troopers[0].grit).toBe(3)
    expect(s.troopers[0].ammo).toBe(3)
    expect(s.troopers[0].status).toBe('ok')
    // Mission in list has status live
    expect(s.missions.find(m => m.id === 'm1')!.status).toBe('live')
    // currentView navigated to 'mission'
    expect(s.currentView).toBe('mission')
  })

  // ── Test B: completeMission clears state.mission ──────────────────────────

  it('completeMission sets state.mission to null and updates mission status', async () => {
    const liveMissionState: MissionState = {
      id: 'm1', name: 'Op',
      sectors: [{ id: 's1', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }],
      activeSectorId: 's1', phase: 'mission_complete', engagement: null,
      momentum: 1, advance_rolls: 2, stealth: false, notes: '',
      transitionFromSectorId: null, squadId: 'sq1',
    }
    useStore.setState({
      missions: [{ id: 'm1', campaignId: 'c1', status: 'live', name: 'Op', squadId: 'sq1' }],
      campaigns: [{ id: 'c1', name: 'Camp', description: '', created_at: '', req: 3, reqEnabled: true, currentMissionId: 'm1' }],
      mission: liveMissionState,
    })
    await useStore.getState().completeMission('m1', { fieldReport: 'test', outcome: 'victory' })
    const s = useStore.getState()
    expect(s.mission).toBeNull()
    expect(s.missions.find(m => m.id === 'm1')!.status).toBe('completed')
    expect(s.currentView).toBe('hq')
  })

  // ── Test C: selectCampaign hydrates state.mission from live mission state ─

  it('selectCampaign hydrates state.mission when live mission has state', async () => {
    const liveMissionState: MissionState = {
      id: 'live-m', name: 'Hot LZ',
      sectors: [{ id: 'sec1', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }],
      activeSectorId: 'sec1', phase: 'advance', engagement: null,
      momentum: 1, advance_rolls: 1, stealth: false, notes: '',
      transitionFromSectorId: null, squadId: 'sq1',
    }

    // selectCampaign calls apiFetch directly — mock the response via the imported api object
    vi.mocked(api.apiFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        campaign: {
          id: 'c1', name: 'Camp', description: '', created_at: '',
          defaultAirspace: 'contested', reqEnabled: false, req: 0,
          currentMissionId: 'live-m',
        },
        troopers: [],
        diceHistory: [],
        squads: [],
        missions: [
          { id: 'live-m', status: 'live', name: 'Hot LZ', completed_at: null, created_at: '' },
        ],
        currentMission: {
          id: 'live-m',
          status: 'live',
          data: {
            name: 'Hot LZ',
            squadId: 'sq1',
            state: liveMissionState,
          },
          completed_at: null,
          created_at: '',
        },
      }),
    } as Response)

    await useStore.getState().selectCampaign('c1')
    const s = useStore.getState()
    expect(s.mission).not.toBeNull()
    expect(s.mission!.phase).toBe('advance')
    expect(s.mission!.sectors.length).toBe(1)
    expect(s.mission!.squadId).toBe('sq1')
    expect(s.currentCampaignId).toBe('c1')
  })
})

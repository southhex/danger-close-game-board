import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mission, Squad } from '../src/types'

vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client')>('../src/api/client')
  return {
    ...actual,
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
    })),
    completeMissionApi: vi.fn(async (missionId: string) => ({
      mission: { id: missionId, campaignId: 'c1', status: 'completed' as const, name: 'Op' },
      reqAwarded: 2,
      campaignReq: 5,
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
})

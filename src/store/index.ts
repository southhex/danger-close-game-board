import { create } from 'zustand'
import type {
  AppState, Trooper, MissionState, MissionSector, MissionPhase, DiceRoll, ApplyAdvancePayload, View,
  EngagementState, TrooperIntent, OffenseResult, DefenseResult, EnemyTactic,
  HardTarget, AttachedForce, TrooperStatus,
  Campaign, User, AuthStatus, CampaignGearItem,
  Squad, Mission, Airspace, BoonType,
} from '../types'
import { gearByName } from '../data/gear'
import {
  clampMomentum, clampGrit, clampAmmo, clampUses,
  defposForResult, momentumForResult, stealthShouldClear,
  pressureIncreases, isDeployed,
} from '../utils/gameRules'
import { newId } from '../utils/id'
import {
  apiFetch, AuthError,
  createSquadApi, patchSquadApi, deleteSquadApi,
  createMissionApi, patchMissionBlueprintApi, deleteMissionApi,
  deployMissionApi, completeMissionApi, discardMissionApi,
  patchReqApi, buyGearApi, patchGearConfigApi, patchCampaignSettingsApi,
} from '../api/client'
import { fetchBootstrap, SetupRequiredError } from '../api/bootstrap'
import { scheduleSync } from '../api/sync'

interface Store extends AppState {
  squads: Squad[]
  missions: Mission[]
  currentView: View
  diceTrayOpen: boolean
  builderMissionId: string | null   // null = new blueprint; otherwise editing existing

  // Auth + campaign state
  authStatus: AuthStatus
  user: User | null
  campaigns: Campaign[]
  currentCampaignId: string | null
  syncStatus: 'idle' | 'syncing' | 'error'

  // Auth actions
  bootstrap: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setup: (username: string, password: string) => Promise<void>
  changePassword: (current: string, newPwd: string) => Promise<void>

  // Campaign actions
  createCampaign: (name: string, description?: string) => Promise<Campaign>
  deleteCampaign: (id: string) => Promise<void>
  duplicateCampaign: (id: string) => Promise<string>
  renameCampaign: (id: string, name: string, description?: string) => Promise<void>
  selectCampaign: (id: string) => Promise<void>

  // Sync
  setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void

  // Trooper actions
  addTrooper: (t: Omit<Trooper, 'id'>) => void
  updateTrooper: (id: string, patch: Partial<Trooper>) => void
  deleteTrooper: (id: string) => void

  setMission: (patch: Partial<MissionState>) => void
  resetMission: () => void
  applyAdvanceResult: (p: ApplyAdvancePayload) => void

  addRoll: (roll: DiceRoll) => void
  clearHistory: () => void

  setView: (v: View) => void
  setDiceTrayOpen: (open: boolean) => void
  openMissionBuilder: (missionId: string | null) => void

  // Legacy (kept for test compatibility)
  importState: (raw: unknown) => void
  exportState: () => AppState

  // Sector actions
  addSector: (sector: Omit<MissionSector, 'id' | 'status'>) => void
  updateSector: (id: string, patch: Partial<Omit<MissionSector, 'id'>>) => void
  deleteSector: (id: string) => void
  setActiveSector: (id: string) => void

  // Mission phase
  setMissionPhase: (phase: 'advance' | 'engagement' | 'catch_breath' | 'mission_complete') => void
  endMission: () => void

  // Sector clear-and-advance
  overwhelmActiveSector: () => void
  bypassActiveSector: () => void

  // Stage 7: DetermineSector phase
  applySectorRoll: (sectorId: string, values: { cover: 0|1|2; space: 0|1|2; tl: 1|2|3|4; weather: -2|-1|0|1 }) => void
  applySectorBoon: (sectorId: string, boon: { type: BoonType; note?: string }) => void
  applySectorEmpty: (sectorId: string) => void
  applyAmmoCache: () => void
  applyEnemyIntel: () => void
  applyFallenFriendlies: (args: { ammoTrooperId?: string; ammo?: number; weaponTrooperId?: string; weapon?: string }) => void
  applyRookies: () => void
  reactivateSector: (sectorId: string, resetContents: boolean) => void

  // Engagement lifecycle
  beginEngagement: () => void
  updateEngagement: (patch: Partial<EngagementState>) => void
  setExchangeStep: (step: EngagementState['step']) => void
  setTrooperIntent: (trooperId: string, intent: TrooperIntent) => void
  resolveOffenseRoll: (result: OffenseResult) => void
  resolveDefenseRoll: (trooperId: string, result: DefenseResult) => void
  resolveEnemyTactics: (args: {
    naturalD6: number
    total: number
    tactic: EnemyTactic
    repositionTrooperId?: string
    scatterTrooperId?: string
  }) => void
  beginNextExchange: () => void
  endEngagement: (outcome: 'victory' | 'defeat' | 'disengage') => void
  advanceToNextSector: () => void
  clearTransition: () => void

  applyHardTargetHit: (targetId: string, atCost: boolean, costTrooperId?: string) => void
  updatePressure: (delta: number) => void
  commitAttachedForce: (forceId: string) => void
  resolveAttachedForceDice: (forceId: string, results: number[]) => void
  addHardTarget: (ht: Omit<HardTarget, 'id'>) => void
  addAttachedForce: (af: Omit<AttachedForce, 'id'>) => void
  nullifyTactic: (trooperId: string) => void

  // ── Stage 2 stub mutators (UI not wired yet) ─────────────────────────────
  createSquad: (input: { name: string; callsign?: string }) => Promise<Squad | null>
  renameSquad: (id: string, name: string) => Promise<void>
  setSquadSergeant: (id: string, sergeantId: string | null) => Promise<void>
  setSquadPerks: (id: string, perks: Squad['perks']) => Promise<void>
  setSquadNotes: (id: string, notes: string) => Promise<void>
  deleteSquad: (id: string) => Promise<void>
  assignTrooperToSquad: (trooperId: string, squadId: string | null) => void
  setTrooperRecovering: (trooperId: string, recovering: boolean) => void

  createMission: (input: Omit<Mission, 'id' | 'campaignId' | 'status' | 'created_at' | 'completed_at'>) => Promise<Mission | null>
  updateMissionBlueprint: (mission: Mission) => Promise<void>
  deleteMission: (id: string) => Promise<void>
  deployMission: (missionId: string, squadId: string) => Promise<void>
  completeMission: (missionId: string, body: { fieldReport: string; outcome: 'victory' | 'defeat' | 'aborted' }) => Promise<void>
  discardMission: () => Promise<void>

  setReq: (req: number) => Promise<void>
  buyGearStock: (gearName: string, qty: number, catalogueReq: number) => Promise<void>
  updateGearConfig: (gearName: string, patch: { customName?: string | null; customReq?: number | null }) => Promise<void>
  setCampaignAirspace: (airspace: Airspace) => Promise<void>
  setCampaignReqEnabled: (enabled: boolean) => Promise<void>
}

const DEFAULT_MISSION: MissionState = {
  id: 'current',
  name: 'Current Mission',
  sectors: [{ id: 'sector-1', name: 'Sector Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }],
  activeSectorId: 'sector-1',
  phase: 'advance' as const,
  engagement: null,
  momentum: 0,
  advance_rolls: 0,
  stealth: false,
  notes: '',
  transitionFromSectorId: null,
}

function missionStateFromBlueprint(mission: Mission, squadId: string): MissionState {
  const rawSectors: MissionSector[] = mission.sectors?.length
    ? mission.sectors.map(s => ({ ...s, status: 'pending' as const }))
    : [{ id: newId(), name: 'Sector 1', cover: 0 as const, space: 0 as const, tl: 1 as const, weather: 0 as const, status: 'pending' as const }]

  const firstSector: MissionSector = { ...rawSectors[0], status: 'active' as const }
  const restSectors = rawSectors.slice(1)
  const allSectors: MissionSector[] = [firstSector, ...restSectors]

  const phase: MissionPhase = firstSector.contentsState === 'undetermined'
    ? 'determine_sector'
    : 'advance'

  return {
    id: mission.id,
    name: mission.name,
    sectors: allSectors,
    activeSectorId: firstSector.id,
    phase,
    engagement: null,
    momentum: 0,
    advance_rolls: 0,
    stealth: mission.stealthStart ?? false,
    notes: '',
    transitionFromSectorId: null,
    squadId,
    status: 'live',
    nextAdvanceBonus: undefined,
    pendingAttachedForces: undefined,
  }
}

function maxUsesFor(gearName: string): number {
  const g = gearByName(gearName)
  if (!g || g.max_uses < 0) return -1
  return g.max_uses
}

function resetTrooperForMission(t: Trooper): Trooper {
  return {
    ...t,
    grit: t.grit_max,
    ammo: t.ammo_max,
    status: 'ok',
    offpos: 'engaged',
    defpos: 'incover',
    suppressed: false,
    def_modifier: 0,
    special_weapon_uses: t.special_weapon ? maxUsesFor(t.special_weapon) : -1,
    special_gear_uses: t.special_gear ? maxUsesFor(t.special_gear) : -1,
    wasBleedingOut: false,
  }
}

function clearAndAdvanceMission(
  mission: MissionState,
  troopers: Trooper[],
): { mission: MissionState; troopers: Trooper[] } {
  const sectors = mission.sectors
  const fromSectorId = mission.activeSectorId
  const currentIdx = sectors.findIndex(sec => sec.id === fromSectorId)
  const nextSector = sectors.slice(currentIdx + 1).find(sec => sec.status === 'pending')

  const clearedSectors = sectors.map(sec =>
    sec.id === fromSectorId ? { ...sec, status: 'cleared' as const } : sec,
  )

  const nextTroopers = troopers.map(t => {
    if (!isDeployed(t, mission)) return t
    const jumpPackMax = t.special_gear === 'Jump Pack' ? maxUsesFor('Jump Pack') : t.special_gear_uses
    return {
      ...t,
      suppressed: false,
      def_modifier: 0,
      special_gear_uses: jumpPackMax,
    }
  })

  if (!nextSector) {
    return {
      troopers: nextTroopers,
      mission: {
        ...mission,
        sectors: clearedSectors,
        advance_rolls: 0,
        phase: 'catch_breath' as const,
        engagement: null,
        transitionFromSectorId: null,
      },
    }
  }

  const activatedSectors = clearedSectors.map(sec =>
    sec.id === nextSector.id ? { ...sec, status: 'active' as const } : sec,
  )

  const nextPhase: MissionPhase = nextSector.contentsState === 'undetermined'
    ? 'determine_sector'
    : 'advance'

  return {
    troopers: nextTroopers,
    mission: {
      ...mission,
      sectors: activatedSectors,
      activeSectorId: nextSector.id,
      advance_rolls: 0,
      phase: nextPhase,
      engagement: null,
      transitionFromSectorId: fromSectorId,
    },
  }
}

function clampTrooper(t: Trooper): Trooper {
  const swMax = t.special_weapon ? maxUsesFor(t.special_weapon) : -1
  const sgMax = t.special_gear ? maxUsesFor(t.special_gear) : -1
  return {
    ...t,
    grit: clampGrit(t.grit, t.grit_max),
    ammo: clampAmmo(t.ammo, t.ammo_max),
    special_weapon_uses: clampUses(t.special_weapon_uses, swMax),
    special_gear_uses: clampUses(t.special_gear_uses, sgMax),
  }
}

const DICE_HISTORY_CAP = 20

function advanceStatusByInjury(status: TrooperStatus): TrooperStatus {
  if (status === 'ok') return 'grazed'
  if (status === 'grazed') return 'wounded'
  if (status === 'wounded') return 'bleedingout'
  return status
}

function initialEngagementState(): EngagementState {
  return {
    exchangeNumber: 1,
    step: 'intent',
    pressure: 0,
    hardTargets: [],
    attachedForces: [],
    intents: {},
    offenseResult: null,
    defenseResults: {},
    pendingTactic: null,
    radioStrikeCountdown: null,
    nextExchangeModifiers: { atkPenalty: 0, flankingDefPenalty: [], mustMove: [], flankedMustFallBack: [] },
    momentumGainedLastExchange: false,
    trooperDiedLastExchange: false,
    trooperMovedLastExchange: {},
    tankActsThisExchange: false,
  }
}

export const useStore = create<Store>()(
  (set, get) => ({
    // ── Base state ─────────────────────────────────────────────────────────────
    troopers: [],
    mission: null,
    diceHistory: [],
    campaignGear: [],
    squads: [],
    missions: [],
    currentView: 'barracks',
    diceTrayOpen: false,
    builderMissionId: null,

    // Auth + campaign state
    authStatus: 'loading',
    user: null,
    campaigns: [],
    currentCampaignId: null,
    syncStatus: 'idle',

    // ── Auth actions ───────────────────────────────────────────────────────────

    bootstrap: async () => {
      try {
        const { user, campaigns } = await fetchBootstrap()
        set({ authStatus: 'authenticated', user, campaigns })
      } catch (err) {
        if (err instanceof SetupRequiredError) {
          set({ authStatus: 'setup_required', user: null, campaigns: [] })
        } else if (err instanceof AuthError) {
          set({ authStatus: 'unauthenticated', user: null, campaigns: [] })
        } else {
          // Network error etc — treat as unauthenticated
          set({ authStatus: 'unauthenticated', user: null, campaigns: [] })
        }
      }
    },

    login: async (username, password) => {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Login failed')
      }
      await get().bootstrap()
    },

    logout: async () => {
      await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
      set({
        authStatus: 'unauthenticated',
        user: null,
        campaigns: [],
        currentCampaignId: null,
        troopers: [],
        mission: null,
        diceHistory: [],
        campaignGear: [],
        squads: [],
        missions: [],
      })
    },

    setup: async (username, password) => {
      const res = await apiFetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Setup failed')
      }
      await get().bootstrap()
    },

    changePassword: async (current, newPwd) => {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: newPwd }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Password change failed')
      }
    },

    // ── Campaign actions ───────────────────────────────────────────────────────

    createCampaign: async (name, description = '') => {
      const res = await apiFetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Create campaign failed')
      }
      const campaign = await res.json() as Campaign
      set(s => ({ campaigns: [...s.campaigns, campaign] }))
      return campaign
    },

    deleteCampaign: async (id) => {
      const res = await apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Delete campaign failed')
      }
      set(s => {
        const campaigns = s.campaigns.filter(c => c.id !== id)
        const currentCampaignId = s.currentCampaignId === id ? null : s.currentCampaignId
        return { campaigns, currentCampaignId }
      })
    },

    duplicateCampaign: async (id) => {
      const res = await apiFetch(`/api/campaigns/${id}/duplicate`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Duplicate campaign failed')
      }
      const newCampaign = await res.json() as { id: string; name: string }
      set(s => ({ campaigns: [...s.campaigns, { id: newCampaign.id, name: newCampaign.name, description: '', req: 0, reqEnabled: false } as Campaign] }))
      await get().selectCampaign(newCampaign.id)
      return newCampaign.id
    },

    renameCampaign: async (id, name, description) => {
      const res = await apiFetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ...(description !== undefined ? { description } : {}) }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Rename campaign failed')
      }
      const updated = await res.json() as Campaign
      set(s => ({
        campaigns: s.campaigns.map(c => c.id === id ? updated : c),
      }))
    },

    selectCampaign: async (id) => {
      const res = await apiFetch(`/api/campaigns/${id}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Load campaign failed')
      }
      const data = await res.json() as {
        troopers?: Trooper[]
        mission?: MissionState | null
        diceHistory?: DiceRoll[]
        campaign?: Campaign
        squads?: Array<{ id: string; data: Record<string, unknown>; created_at?: string }>
        missions?: Array<{ id: string; status: string; name: string; data?: Record<string, unknown>; completed_at: string | null; created_at: string }>
        currentMission?: { id: string; status: string; data: Record<string, unknown>; completed_at: string | null; created_at: string } | null
        campaignGear?: CampaignGearItem[]
      }

      // Hydrate squads — server returns { id, data: { name, callsign, ... } }
      const squads: Squad[] = (data.squads ?? []).map(s => ({
        id: s.id,
        campaignId: id,
        name: typeof s.data['name'] === 'string' ? (s.data['name'] as string) : '',
        callsign: typeof s.data['callsign'] === 'string' ? (s.data['callsign'] as string) : '',
        sergeantId: typeof s.data['sergeantId'] === 'string' ? (s.data['sergeantId'] as string) : null,
        perks: Array.isArray(s.data['perks']) ? (s.data['perks'] as Squad['perks']) : [],
        notes: typeof s.data['notes'] === 'string' ? (s.data['notes'] as string) : '',
        created_at: s.created_at,
      }))

      // Hydrate missions (lite) — currentMission gets merged with full data if present
      const liteList = data.missions ?? []
      const live = data.currentMission
      const missions: Mission[] = liteList.map(m => {
        if (live && m.id === live.id) {
          const d = live.data
          return {
            id: live.id,
            campaignId: id,
            status: live.status as Mission['status'],
            name: typeof d['name'] === 'string' ? (d['name'] as string) : m.name,
            description: typeof d['description'] === 'string' ? (d['description'] as string) : undefined,
            difficulty: d['difficulty'] as Mission['difficulty'] | undefined,
            objectiveCategory: d['objectiveCategory'] as Mission['objectiveCategory'] | undefined,
            objectiveSubtype: d['objectiveSubtype'] as Mission['objectiveSubtype'] | undefined,
            airspace: d['airspace'] as Mission['airspace'] | undefined,
            insertion: d['insertion'] as Mission['insertion'] | undefined,
            squadId: typeof d['squadId'] === 'string' ? (d['squadId'] as string) : null,
            state: (d['state'] as MissionState | null | undefined) ?? null,
            fieldReport: typeof d['fieldReport'] === 'string' ? (d['fieldReport'] as string) : '',
            outcome: d['outcome'] as Mission['outcome'] | undefined,
            awardedReq: typeof d['awardedReq'] === 'number' ? (d['awardedReq'] as number) : undefined,
            completed_at: live.completed_at,
            created_at: live.created_at,
          }
        }
        const d = m.data ?? {}
        return {
          id: m.id,
          campaignId: id,
          status: m.status as Mission['status'],
          name: m.name,
          description: typeof d['description'] === 'string' ? (d['description'] as string) : undefined,
          difficulty: d['difficulty'] as Mission['difficulty'] | undefined,
          objectiveCategory: d['objectiveCategory'] as Mission['objectiveCategory'] | undefined,
          objectiveSubtype: d['objectiveSubtype'] as Mission['objectiveSubtype'] | undefined,
          airspace: d['airspace'] as Mission['airspace'] | undefined,
          insertion: d['insertion'] as Mission['insertion'] | undefined,
          defaultWeather: d['defaultWeather'] as Mission['defaultWeather'] | undefined,
          stealthStart: typeof d['stealthStart'] === 'boolean' ? (d['stealthStart'] as boolean) : undefined,
          sectors: Array.isArray(d['sectors']) ? (d['sectors'] as MissionSector[]) : undefined,
          completed_at: m.completed_at,
          created_at: m.created_at,
        }
      })

      // Sync top-level Campaign in `campaigns` array with extended fields
      const updatedCampaign = data.campaign

      // Hydrate state.mission from the live mission's embedded state (resume support)
      const liveMission = missions.find(
        m => m.id === updatedCampaign?.currentMissionId && m.status === 'live',
      )
      let hydratedMission: MissionState | null = null
      if (liveMission?.state) {
        hydratedMission = liveMission.state
      }
      // If no live mission, hydratedMission stays null (clears any stale state)

      set(s => ({
        currentCampaignId: id,
        troopers: data.troopers ?? [],
        mission: hydratedMission,
        diceHistory: data.diceHistory ?? [],
        campaignGear: data.campaignGear ?? [],
        squads,
        missions,
        campaigns: updatedCampaign
          ? s.campaigns.map(c => c.id === id ? { ...c, ...updatedCampaign } : c)
          : s.campaigns,
      }))
    },

    setSyncStatus: (status) => set({ syncStatus: status }),

    // ── Trooper actions ────────────────────────────────────────────────────────

    addTrooper: (t) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => ({ troopers: [...s.troopers, { ...t, id: newId() }] }))
      scheduleSync()
    },

    updateTrooper: (id, patch) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => ({
        troopers: s.troopers.map(t => t.id === id ? clampTrooper({ ...t, ...patch }) : t),
      }))
      scheduleSync()
    },

    deleteTrooper: (id) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => ({ troopers: s.troopers.filter(t => t.id !== id) }))
      scheduleSync()
    },

    setMission: (patch) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => ({
        mission: s.mission ? { ...s.mission, ...patch, momentum: 'momentum' in patch ? clampMomentum(patch.momentum!) : s.mission.momentum } : null,
      }))
      scheduleSync()
    },

    resetMission: () => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        const m = { ...DEFAULT_MISSION, id: newId(), squadId: s.mission?.squadId ?? null }
        return {
          mission: m,
          troopers: s.troopers.map(t => isDeployed(t, m) ? resetTrooperForMission(t) : t),
        }
      })
      scheduleSync()
    },

    applyAdvanceResult: ({ result, trooperOffpos }) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        const dpos = defposForResult(result)
        const mom = momentumForResult(result)
        const clearStealth = stealthShouldClear(result)
        const nextTroopers = s.troopers.map(t => {
          if (!isDeployed(t, s.mission)) return t
          const next = { ...t }
          if (dpos) next.defpos = dpos
          if (trooperOffpos && trooperOffpos[t.id]) next.offpos = trooperOffpos[t.id]
          return next
        })
        return {
          troopers: nextTroopers,
          mission: {
            ...s.mission,
            momentum: mom !== null ? clampMomentum(mom) : s.mission.momentum,
            advance_rolls: s.mission.advance_rolls + 1,
            stealth: clearStealth ? false : s.mission.stealth,
          },
        }
      })
      scheduleSync()
    },

    addRoll: (roll) => {
      set((s) => ({
        diceHistory: [roll, ...s.diceHistory].slice(0, DICE_HISTORY_CAP),
      }))
      if (get().currentCampaignId) scheduleSync()
    },

    clearHistory: () => {
      set({ diceHistory: [] })
      if (get().currentCampaignId) scheduleSync()
    },

    setView: (v) => set({ currentView: v }),
    setDiceTrayOpen: (open) => set({ diceTrayOpen: open }),
    openMissionBuilder: (missionId) => set({ builderMissionId: missionId, currentView: 'builder' }),

    // ── Sector actions ─────────────────────────────────────────────────────────

    addSector: (sector) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return {
          mission: {
            ...s.mission,
            sectors: [...s.mission.sectors, { ...sector, id: newId(), status: 'pending' as const }],
          },
        }
      })
      scheduleSync()
    },

    updateSector: (id, patch) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return {
          mission: {
            ...s.mission,
            sectors: s.mission.sectors.map(sec => sec.id === id ? { ...sec, ...patch } : sec),
          },
        }
      })
      scheduleSync()
    },

    deleteSector: (id) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        if (s.mission.activeSectorId === id) return s
        return {
          mission: {
            ...s.mission,
            sectors: s.mission.sectors.filter(sec => sec.id !== id),
          },
        }
      })
      scheduleSync()
    },

    setActiveSector: (id) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        const target = s.mission.sectors.find(sec => sec.id === id)
        if (!target || target.status === 'cleared') return s
        const phase: MissionPhase = target.contentsState === 'undetermined'
          ? 'determine_sector'
          : 'advance'
        return {
          mission: {
            ...s.mission,
            activeSectorId: id,
            phase,
            engagement: null,
            advance_rolls: 0,
            transitionFromSectorId: null,
            sectors: s.mission.sectors.map(sec => {
              if (sec.id === id) return { ...sec, status: 'active' as const }
              if (sec.status === 'active') return { ...sec, status: 'pending' as const }
              return sec
            }),
          },
        }
      })
      scheduleSync()
    },

    // ── Mission phase ──────────────────────────────────────────────────────────

    setMissionPhase: (phase) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return { mission: { ...s.mission, phase } }
      })
      scheduleSync()
    },

    // ── Engagement lifecycle ───────────────────────────────────────────────────

    beginEngagement: () => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        const pending = s.mission.pendingAttachedForces ?? []
        return {
          mission: {
            ...s.mission,
            phase: 'engagement' as const,
            engagement: { ...initialEngagementState(), attachedForces: pending },
            pendingAttachedForces: [],
          },
        }
      })
      scheduleSync()
    },

    updateEngagement: (patch) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        return {
          mission: {
            ...s.mission,
            engagement: { ...s.mission.engagement, ...patch },
          },
        }
      })
      scheduleSync()
    },

    setExchangeStep: (step) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        return {
          mission: {
            ...s.mission,
            engagement: { ...s.mission.engagement, step },
          },
        }
      })
      scheduleSync()
    },

    setTrooperIntent: (trooperId, intent) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        return {
          mission: {
            ...s.mission,
            engagement: {
              ...s.mission.engagement,
              intents: { ...s.mission.engagement.intents, [trooperId]: intent },
            },
          },
        }
      })
      scheduleSync()
    },

    resolveOffenseRoll: (result) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        const newMomentum = clampMomentum(s.mission.momentum + result.momentumDelta)
        return {
          mission: {
            ...s.mission,
            momentum: newMomentum,
            engagement: {
              ...s.mission.engagement,
              offenseResult: result,
              momentumGainedLastExchange: result.momentumDelta > 0,
            },
          },
        }
      })
      scheduleSync()
    },

    resolveDefenseRoll: (trooperId, result) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        let nextTroopers = s.troopers
        const trooperDied = s.mission.engagement.trooperDiedLastExchange
        if (result.resolution === 'injury' && result.injuryCount && result.injuryCount > 0) {
          nextTroopers = s.troopers.map(t => {
            if (t.id !== trooperId) return t
            let newStatus = t.status
            for (let i = 0; i < result.injuryCount!; i++) {
              newStatus = advanceStatusByInjury(newStatus)
            }
            const nowBleedingOut = newStatus === 'bleedingout'
            return { ...t, status: newStatus, wasBleedingOut: t.wasBleedingOut || nowBleedingOut }
          })
        }
        if (result.resolution === 'suppressed') {
          nextTroopers = nextTroopers.map(t =>
            t.id === trooperId ? { ...t, suppressed: true } : t,
          )
        }
        return {
          troopers: nextTroopers,
          mission: {
            ...s.mission,
            engagement: {
              ...s.mission.engagement,
              trooperDiedLastExchange: trooperDied,
              defenseResults: {
                ...s.mission.engagement.defenseResults,
                [trooperId]: result,
              },
            },
          },
        }
      })
      scheduleSync()
    },

    resolveEnemyTactics: ({ naturalD6, total: _total, tactic, repositionTrooperId, scatterTrooperId }) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        const eng = s.mission.engagement

        const activeSector = s.mission.sectors.find(sec => sec.id === s.mission!.activeSectorId)
        const pressureCap = activeSector ? activeSector.tl + 1 : 5
        const newPressure = pressureIncreases(naturalD6)
          ? Math.min(eng.pressure + 1, pressureCap)
          : eng.pressure

        // Start fresh — each exchange's tactics set modifiers for the next exchange from scratch
        let nextMods = { atkPenalty: 0, flankingDefPenalty: [] as string[], mustMove: [] as string[], flankedMustFallBack: [] as string[] }
        let nextTroopers = s.troopers

        if (tactic === 'reposition' && repositionTrooperId) {
          nextTroopers = s.troopers.map(t =>
            t.id === repositionTrooperId && t.offpos === 'flanking'
              ? { ...t, offpos: 'engaged' as const }
              : t,
          )
        } else if (tactic === 'scatter' && scatterTrooperId) {
          nextMods = { ...nextMods, mustMove: [...nextMods.mustMove, scatterTrooperId] }
        } else if (tactic === 'pinned_down') {
          nextMods = { ...nextMods, atkPenalty: 2 }
        } else if (tactic === 'encircle') {
          nextTroopers = s.troopers.map(t =>
            isDeployed(t, s.mission) && t.defpos === 'fortified' ? { ...t, defpos: 'incover' as const } : t,
          )
        } else if (tactic === 'push_forward') {
          nextTroopers = s.troopers.map(t => {
            if (!isDeployed(t, s.mission)) return t
            if (t.defpos === 'fortified') return { ...t, defpos: 'incover' as const }
            if (t.defpos === 'incover') return { ...t, defpos: 'flanked' as const }
            return t
          })
        } else if (tactic === 'fall_back') {
          nextTroopers = s.troopers.map(t => {
            if (!isDeployed(t, s.mission)) return t
            if (t.offpos === 'flanking') return { ...t, offpos: 'engaged' as const }
            if (t.offpos === 'engaged') return { ...t, offpos: 'limited' as const }
            return t
          })
        }

        return {
          troopers: nextTroopers,
          mission: {
            ...s.mission,
            engagement: {
              ...eng,
              pressure: newPressure,
              pendingTactic: tactic,
              nextExchangeModifiers: nextMods,
            },
          },
        }
      })
      scheduleSync()
    },

    beginNextExchange: () => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        const eng = s.mission.engagement
        const mods = eng.nextExchangeModifiers

        let nextTroopers = s.troopers
        if (mods.flankingDefPenalty.length > 0) {
          nextTroopers = s.troopers.map(t =>
            mods.flankingDefPenalty.includes(t.id) ? { ...t, def_modifier: t.def_modifier - 1 } : t,
          )
        }

        nextTroopers = nextTroopers.map(t =>
          isDeployed(t, s.mission) && t.suppressed && t.defpos === 'fortified' ? { ...t, suppressed: false } : t,
        )

        let newCountdown = eng.radioStrikeCountdown
        if (newCountdown !== null) {
          newCountdown = newCountdown > 0 ? newCountdown - 1 : 0
        }

        return {
          troopers: nextTroopers,
          mission: {
            ...s.mission,
            engagement: {
              ...eng,
              exchangeNumber: eng.exchangeNumber + 1,
              step: 'intent' as const,
              intents: {},
              offenseResult: null,
              defenseResults: {},
              nextExchangeModifiers: { atkPenalty: mods.atkPenalty, flankingDefPenalty: [], mustMove: mods.mustMove, flankedMustFallBack: [] },
              tankActsThisExchange: !eng.tankActsThisExchange,
              trooperMovedLastExchange: {},
              radioStrikeCountdown: newCountdown,
            },
          },
        }
      })
      scheduleSync()
    },

    endEngagement: (outcome) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        const newSectors = outcome === 'victory'
          ? s.mission.sectors.map(sec =>
              sec.id === s.mission!.activeSectorId ? { ...sec, status: 'cleared' as const } : sec,
            )
          : s.mission.sectors
        return {
          mission: {
            ...s.mission,
            sectors: newSectors,
            phase: 'catch_breath' as const,
          },
        }
      })
      scheduleSync()
    },

    endMission: () => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return {
          mission: {
            ...s.mission,
            phase: 'mission_complete' as const,
            engagement: null,
          },
        }
      })
      scheduleSync()
    },

    advanceToNextSector: () => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return clearAndAdvanceMission(s.mission, s.troopers)
      })
      scheduleSync()
    },

    overwhelmActiveSector: () => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return clearAndAdvanceMission(s.mission, s.troopers)
      })
      scheduleSync()
    },

    bypassActiveSector: () => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return clearAndAdvanceMission(s.mission, s.troopers)
      })
      scheduleSync()
    },

    clearTransition: () => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return { mission: { ...s.mission, transitionFromSectorId: null } }
      })
      scheduleSync()
    },

    // ── Stage 7: DetermineSector mutators ─────────────────────────────────────

    applySectorRoll: (sectorId, { cover, space, tl, weather }) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return {
          mission: {
            ...s.mission,
            phase: 'advance' as const,
            sectors: s.mission.sectors.map(sec =>
              sec.id === sectorId
                ? { ...sec, cover, space, tl, weather, contentsState: 'rolled' as const }
                : sec,
            ),
          },
        }
      })
      scheduleSync()
    },

    applySectorBoon: (sectorId, boon) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return {
          mission: {
            ...s.mission,
            phase: 'catch_breath' as const,
            sectors: s.mission.sectors.map(sec =>
              sec.id === sectorId
                ? { ...sec, contentsState: 'rolled' as const, status: 'cleared' as const, boon }
                : sec,
            ),
          },
        }
      })
      scheduleSync()
    },

    applySectorEmpty: (sectorId) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return {
          mission: {
            ...s.mission,
            phase: 'catch_breath' as const,
            sectors: s.mission.sectors.map(sec =>
              sec.id === sectorId
                ? { ...sec, contentsState: 'rolled' as const, status: 'cleared' as const, empty: true }
                : sec,
            ),
          },
        }
      })
      scheduleSync()
    },

    applyAmmoCache: () => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return {
          troopers: s.troopers.map(t => {
            if (!isDeployed(t, s.mission)) return t
            return { ...t, ammo: Math.min(t.ammo_max, t.ammo + 1) }
          }),
        }
      })
      scheduleSync()
    },

    applyEnemyIntel: () => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return { mission: { ...s.mission, nextAdvanceBonus: 1 } }
      })
      scheduleSync()
    },

    applyFallenFriendlies: ({ ammoTrooperId, ammo, weaponTrooperId, weapon }) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return {
          troopers: s.troopers.map(t => {
            if (ammoTrooperId && t.id === ammoTrooperId && ammo != null) {
              return { ...t, ammo: Math.min(t.ammo_max, t.ammo + ammo) }
            }
            if (weaponTrooperId && t.id === weaponTrooperId && weapon) {
              return { ...t, special_weapon: weapon as Trooper['special_weapon'] }
            }
            return t
          }),
        }
      })
      scheduleSync()
    },

    applyRookies: () => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        const rookies: AttachedForce = {
          id: newId(),
          name: 'Rookies',
          dice: 2,
          isVip: false,
          committed: false,
        }
        return {
          mission: {
            ...s.mission,
            pendingAttachedForces: [...(s.mission.pendingAttachedForces ?? []), rookies],
          },
        }
      })
      scheduleSync()
    },

    reactivateSector: (sectorId, resetContents) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission) return s
        return {
          mission: {
            ...s.mission,
            sectors: s.mission.sectors.map(sec => {
              if (sec.id !== sectorId || sec.status !== 'cleared') return sec
              if (resetContents) {
                return {
                  ...sec,
                  status: 'pending' as const,
                  contentsState: 'undetermined' as const,
                  boon: undefined,
                  empty: undefined,
                }
              }
              // Keep contents — mark one-shot boons as consumed so they don't re-apply
              const oneShot: string[] = ['ammo_cache', 'enemy_intel', 'fallen_friendlies']
              const updatedBoon = sec.boon && oneShot.includes(sec.boon.type)
                ? { ...sec.boon, consumed: true }
                : sec.boon
              return { ...sec, status: 'pending' as const, boon: updatedBoon }
            }),
          },
        }
      })
      scheduleSync()
    },

    // ── Hard targets & attached forces ─────────────────────────────────────────

    applyHardTargetHit: (targetId, atCost, costTrooperId) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        const newTargets = s.mission.engagement.hardTargets
          .map(ht => ht.id === targetId ? { ...ht, currentHp: ht.currentHp - 1 } : ht)
          .filter(ht => ht.currentHp > 0)

        let nextTroopers = s.troopers
        if (atCost && costTrooperId) {
          nextTroopers = s.troopers.map(t =>
            t.id === costTrooperId ? { ...t, def_modifier: t.def_modifier - 1 } : t,
          )
        }

        return {
          troopers: nextTroopers,
          mission: {
            ...s.mission,
            engagement: { ...s.mission.engagement, hardTargets: newTargets },
          },
        }
      })
      scheduleSync()
    },

    updatePressure: (delta) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        const activeSector = s.mission.sectors.find(sec => sec.id === s.mission!.activeSectorId)
        const pressureCap = activeSector ? activeSector.tl + 1 : 5
        const newPressure = Math.max(0, Math.min(s.mission.engagement.pressure + delta, pressureCap))
        return {
          mission: {
            ...s.mission,
            engagement: { ...s.mission.engagement, pressure: newPressure },
          },
        }
      })
      scheduleSync()
    },

    commitAttachedForce: (forceId) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        return {
          mission: {
            ...s.mission,
            engagement: {
              ...s.mission.engagement,
              attachedForces: s.mission.engagement.attachedForces.map(af =>
                af.id === forceId ? { ...af, committed: true } : af,
              ),
            },
          },
        }
      })
      scheduleSync()
    },

    resolveAttachedForceDice: (forceId, results) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        const losses = results.filter(r => r === 1).length
        const updatedForces = s.mission.engagement.attachedForces
          .map(af => {
            if (af.id !== forceId) return af
            return { ...af, dice: af.dice - losses }
          })
          .filter(af => af.dice > 0)

        return {
          mission: {
            ...s.mission,
            engagement: { ...s.mission.engagement, attachedForces: updatedForces },
          },
        }
      })
      scheduleSync()
    },

    addHardTarget: (ht) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        return {
          mission: {
            ...s.mission,
            engagement: {
              ...s.mission.engagement,
              hardTargets: [...s.mission.engagement.hardTargets, { ...ht, id: newId() }],
            },
          },
        }
      })
      scheduleSync()
    },

    addAttachedForce: (af) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        return {
          mission: {
            ...s.mission,
            engagement: {
              ...s.mission.engagement,
              attachedForces: [...s.mission.engagement.attachedForces, { ...af, id: newId() }],
            },
          },
        }
      })
      scheduleSync()
    },

    nullifyTactic: (trooperId) => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        return {
          troopers: s.troopers.map(t =>
            t.id === trooperId ? { ...t, grit: Math.max(0, t.grit - 1) } : t,
          ),
          mission: {
            ...s.mission,
            engagement: { ...s.mission.engagement, pendingTactic: null },
          },
        }
      })
      scheduleSync()
    },

    // ── Stage 2 stub mutators ───────────────────────────────────────────────────

    createSquad: async ({ name, callsign = '' }) => {
      const campaignId = get().currentCampaignId
      if (!campaignId) return null
      const created = await createSquadApi(campaignId, {
        name, callsign, sergeantId: null, perks: [], notes: '',
      })
      set(s => ({ squads: [...s.squads, created] }))
      return created
    },

    renameSquad: async (id, name) => {
      const squad = get().squads.find(s => s.id === id)
      if (!squad) return
      const updated = { ...squad, name }
      const result = await patchSquadApi(updated)
      set(s => ({ squads: s.squads.map(sq => sq.id === id ? result : sq) }))
    },

    setSquadSergeant: async (id, sergeantId) => {
      const squad = get().squads.find(s => s.id === id)
      if (!squad) return
      const updated = { ...squad, sergeantId }
      const result = await patchSquadApi(updated)
      set(s => ({ squads: s.squads.map(sq => sq.id === id ? result : sq) }))
    },

    setSquadPerks: async (id, perks) => {
      const squad = get().squads.find(s => s.id === id)
      if (!squad) return
      const updated = { ...squad, perks }
      const result = await patchSquadApi(updated)
      set(s => ({ squads: s.squads.map(sq => sq.id === id ? result : sq) }))
    },

    setSquadNotes: async (id, notes) => {
      const squad = get().squads.find(s => s.id === id)
      if (!squad) return
      const updated = { ...squad, notes }
      const result = await patchSquadApi(updated)
      set(s => ({ squads: s.squads.map(sq => sq.id === id ? result : sq) }))
    },

    deleteSquad: async (id) => {
      await deleteSquadApi(id)
      set(s => ({
        squads: s.squads.filter(sq => sq.id !== id),
        troopers: s.troopers.map(t => t.squadId === id ? { ...t, squadId: null } : t),
      }))
    },

    assignTrooperToSquad: (trooperId, squadId) => {
      const s = get()
      if (squadId !== null) {
        const memberCount = s.troopers.filter(t => t.squadId === squadId && t.id !== trooperId).length
        if (memberCount >= 5) throw new Error('Squad is full (5 max)')
      }
      set(state => ({
        troopers: state.troopers.map(t => t.id === trooperId ? { ...t, squadId } : t),
      }))
      scheduleSync()
    },

    setTrooperRecovering: (trooperId, recovering) => {
      set(s => ({
        troopers: s.troopers.map(t => t.id === trooperId ? { ...t, recovering } : t),
      }))
      scheduleSync()
    },

    createMission: async (input) => {
      const campaignId = get().currentCampaignId
      if (!campaignId) return null
      const created = await createMissionApi(campaignId, input)
      set(s => ({ missions: [...s.missions, created] }))
      return created
    },

    updateMissionBlueprint: async (mission) => {
      const updated = await patchMissionBlueprintApi(mission)
      set(s => ({ missions: s.missions.map(m => m.id === mission.id ? updated : m) }))
    },

    deleteMission: async (id) => {
      await deleteMissionApi(id)
      set(s => ({ missions: s.missions.filter(m => m.id !== id) }))
    },

    deployMission: async (missionId, squadId) => {
      const updated = await deployMissionApi(missionId, squadId)
      const campaignId = get().currentCampaignId

      // Build fresh MissionState from the returned live mission's blueprint sectors
      const missionState = missionStateFromBlueprint(updated, squadId)

      set(s => {
        // Reset deployed squad members; auto-clear recovering on troopers NOT in the squad
        const resetTroopers = s.troopers.map(t => {
          if (t.squadId === squadId) return resetTrooperForMission(t)
          if (t.recovering) return { ...t, recovering: false }
          return t
        })
        return {
          missions: s.missions.map(m => m.id === missionId ? updated : m),
          campaigns: campaignId
            ? s.campaigns.map(c => c.id === campaignId ? { ...c, currentMissionId: missionId } : c)
            : s.campaigns,
          troopers: resetTroopers,
          mission: missionState,
          currentView: 'mission' as View,
        }
      })
    },

    completeMission: async (missionId, body) => {
      const result = await completeMissionApi(missionId, body)
      const campaignId = get().currentCampaignId
      const liveMission = get().mission
      const deployedSquadId = liveMission?.squadId ?? null
      set(s => {
        const updatedTroopers = s.troopers.map(t => {
          if (!deployedSquadId || t.squadId !== deployedSquadId) return t
          if (t.status === 'dead') return t
          // Refill grit for survivors: min(grit_max + 1, 3) per SRD
          const bonusGrit = Math.min(t.grit_max + 1, 3)
          if (result.recoveringIds.includes(t.id)) {
            return { ...t, recovering: true, grit: bonusGrit }
          }
          return { ...t, grit: bonusGrit }
        })
        return {
          missions: s.missions.map(m => m.id === missionId ? result.mission : m),
          campaigns: campaignId
            ? s.campaigns.map(c => c.id === campaignId
                ? { ...c, currentMissionId: null, req: result.campaignReq }
                : c)
            : s.campaigns,
          troopers: updatedTroopers,
          mission: null,
          currentView: 'hq' as View,
        }
      })
      scheduleSync()
    },

    discardMission: async () => {
      const campaignId = get().currentCampaignId
      const campaign = get().campaigns.find(c => c.id === campaignId)
      const missionId = campaign?.currentMissionId
      if (!missionId) return
      await discardMissionApi(missionId)
      set(s => ({
        missions: s.missions.map(m =>
          m.id === missionId
            ? { ...m, status: 'completed' as Mission['status'], outcome: 'aborted' as Mission['outcome'] }
            : m
        ),
        campaigns: campaignId
          ? s.campaigns.map(c => c.id === campaignId ? { ...c, currentMissionId: null } : c)
          : s.campaigns,
        mission: null,
        currentView: 'hq' as View,
      }))
    },

    setReq: async (req) => {
      const campaignId = get().currentCampaignId
      if (!campaignId) return
      await patchReqApi(campaignId, req)
      set(s => ({
        campaigns: s.campaigns.map(c => c.id === campaignId ? { ...c, req } : c),
      }))
    },

    buyGearStock: async (gearName, qty, catalogueReq) => {
      const campaignId = get().currentCampaignId
      if (!campaignId) return
      const result = await buyGearApi(campaignId, { gearName, qty, catalogueReq })
      set(s => {
        const existing = s.campaignGear.find(g => g.gearName === gearName)
        const updated: CampaignGearItem = existing
          ? { ...existing, stock: result.gear.stock }
          : { gearName, stock: result.gear.stock, customName: result.gear.customName, customReq: result.gear.customReq }
        return {
          campaigns: s.campaigns.map(c => c.id === campaignId ? { ...c, req: result.req } : c),
          campaignGear: existing
            ? s.campaignGear.map(g => g.gearName === gearName ? updated : g)
            : [...s.campaignGear, updated],
        }
      })
    },

    updateGearConfig: async (gearName, patch) => {
      const campaignId = get().currentCampaignId
      if (!campaignId) return
      const result = await patchGearConfigApi(campaignId, gearName, patch)
      set(s => {
        const existing = s.campaignGear.find(g => g.gearName === gearName)
        const updated: CampaignGearItem = {
          gearName,
          stock:      result.stock,
          customName: result.customName,
          customReq:  result.customReq,
        }
        return {
          campaignGear: existing
            ? s.campaignGear.map(g => g.gearName === gearName ? updated : g)
            : [...s.campaignGear, updated],
        }
      })
    },

    setCampaignAirspace: async (airspace) => {
      const campaignId = get().currentCampaignId
      if (!campaignId) return
      await patchCampaignSettingsApi(campaignId, { defaultAirspace: airspace })
      set(s => ({
        campaigns: s.campaigns.map(c => c.id === campaignId ? { ...c, defaultAirspace: airspace } : c),
      }))
    },

    setCampaignReqEnabled: async (enabled) => {
      const campaignId = get().currentCampaignId
      if (!campaignId) return
      await patchCampaignSettingsApi(campaignId, { reqEnabled: enabled })
      set(s => ({
        campaigns: s.campaigns.map(c => c.id === campaignId ? { ...c, reqEnabled: enabled } : c),
      }))
    },

    // ── Legacy actions (kept for test compatibility) ────────────────────────────

    importState: (raw) => {
      if (!raw || typeof raw !== 'object') throw new Error('Invalid import: not an object')
      const r = raw as Partial<AppState>
      if (!Array.isArray(r.troopers)) throw new Error('Invalid import: missing troopers')
      try {
        set({
          troopers: r.troopers,
          mission: r.mission ?? null,
          diceHistory: Array.isArray(r.diceHistory) ? r.diceHistory : [],
        })
      } catch {
        throw new Error('Invalid import: data could not be applied')
      }
    },

    exportState: () => {
      const { troopers, mission, diceHistory } = get()
      return { troopers, mission, diceHistory }
    },
  }),
)

import { create } from 'zustand'
import type {
  AppState, Trooper, MissionState, MissionSector, DiceRoll, ApplyAdvancePayload, View,
  EngagementState, TrooperIntent, OffenseResult, DefenseResult, EnemyTactic,
  HardTarget, AttachedForce, TrooperStatus,
  Campaign, User, AuthStatus,
} from '../types'
import { gearByName } from '../data/gear'
import {
  clampMomentum, clampGrit, clampAmmo, clampUses,
  defposForResult, momentumForResult, stealthShouldClear,
  pressureIncreases,
} from '../utils/gameRules'
import { newId } from '../utils/id'
import { apiFetch, AuthError } from '../api/client'
import { fetchBootstrap, SetupRequiredError } from '../api/bootstrap'
import { scheduleSync } from '../api/sync'

interface Store extends AppState {
  currentView: View
  diceTrayOpen: boolean

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
  renameCampaign: (id: string, name: string, description?: string) => Promise<void>
  selectCampaign: (id: string) => Promise<void>

  // Sync
  setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void

  // Trooper actions
  addTrooper: (t: Omit<Trooper, 'id'>) => void
  updateTrooper: (id: string, patch: Partial<Trooper>) => void
  deleteTrooper: (id: string) => void
  prepareMission: () => void

  setMission: (patch: Partial<MissionState>) => void
  resetMission: () => void
  applyAdvanceResult: (p: ApplyAdvancePayload) => void

  addRoll: (roll: DiceRoll) => void
  clearHistory: () => void

  setView: (v: View) => void
  setDiceTrayOpen: (open: boolean) => void

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
    if (!t.active) return t
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

  return {
    troopers: nextTroopers,
    mission: {
      ...mission,
      sectors: activatedSectors,
      activeSectorId: nextSector.id,
      advance_rolls: 0,
      phase: 'advance' as const,
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
    currentView: 'barracks',
    diceTrayOpen: false,

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
      const data = await res.json() as { troopers: Trooper[]; mission: MissionState | null; diceHistory: DiceRoll[] }
      set({
        currentCampaignId: id,
        troopers: data.troopers ?? [],
        mission: data.mission ?? null,
        diceHistory: data.diceHistory ?? [],
      })
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

    prepareMission: () => {
      if (get().authStatus === 'authenticated' && !get().currentCampaignId) return
      set((s) => ({
        troopers: s.troopers.map(t => t.active ? resetTrooperForMission(t) : t),
        mission: s.mission ?? { ...DEFAULT_MISSION, id: newId() },
      }))
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
      set((s) => ({
        mission: { ...DEFAULT_MISSION, id: newId() },
        troopers: s.troopers.map(t => t.active ? resetTrooperForMission(t) : t),
      }))
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
          if (!t.active) return t
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
        return {
          mission: {
            ...s.mission,
            activeSectorId: id,
            phase: 'advance' as const,
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
        return {
          mission: {
            ...s.mission,
            phase: 'engagement' as const,
            engagement: initialEngagementState(),
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
            return { ...t, status: newStatus }
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

        let nextMods = { ...eng.nextExchangeModifiers }
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
            t.active && t.defpos === 'fortified' ? { ...t, defpos: 'incover' as const } : t,
          )
        } else if (tactic === 'push_forward') {
          nextTroopers = s.troopers.map(t => {
            if (!t.active) return t
            if (t.defpos === 'fortified') return { ...t, defpos: 'incover' as const }
            if (t.defpos === 'incover') return { ...t, defpos: 'flanked' as const }
            return t
          })
        } else if (tactic === 'fall_back') {
          nextTroopers = s.troopers.map(t => {
            if (!t.active) return t
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
          t.active && t.suppressed && t.defpos === 'fortified' ? { ...t, suppressed: false } : t,
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
              nextExchangeModifiers: { atkPenalty: 0, flankingDefPenalty: [], mustMove: [], flankedMustFallBack: [] },
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

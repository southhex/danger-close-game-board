import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AppState, Trooper, MissionState, MissionSector, DiceRoll, ApplyAdvancePayload, View,
  EngagementState, TrooperIntent, OffenseResult, DefenseResult, EnemyTactic,
  HardTarget, AttachedForce, TrooperStatus,
} from '../types'
import { gearByName } from '../data/gear'
import {
  clampMomentum, clampGrit, clampAmmo, clampUses,
  defposForResult, momentumForResult, stealthShouldClear,
  pressureIncreases,
} from '../utils/gameRules'
import { newId } from '../utils/id'

interface Store extends AppState {
  currentView: View
  diceTrayOpen: boolean

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

  // Sector clear-and-advance (used by overwhelm and bypass paths)
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

// Shared by advanceToNextSector / overwhelmActiveSector / bypassActiveSector.
// Marks the active sector cleared, then either activates the next pending
// sector (phase='advance') or, if none, transitions to catch_breath so the
// user can choose to add a sector or end the mission. Resets advance_rolls
// and trooper transient state; sets transitionFromSectorId for the
// post-advance banner. Caller must ensure mission is non-null.
function clearAndAdvanceMission(
  mission: MissionState,
  troopers: Trooper[],
): { mission: MissionState; troopers: Trooper[] } {
  const sectors = mission.sectors
  const fromSectorId = mission.activeSectorId
  const currentIdx = sectors.findIndex(sec => sec.id === fromSectorId)
  const nextSector = sectors.slice(currentIdx + 1).find(sec => sec.status === 'pending')

  // Mark current cleared regardless of whether a next sector exists.
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
  // bleedingout and dead both stay as-is during engagement
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
  persist(
    (set, get) => ({
      troopers: [],
      mission: null,
      diceHistory: [],
      currentView: 'barracks',
      diceTrayOpen: false,

      addTrooper: (t) => set((s) => ({ troopers: [...s.troopers, { ...t, id: newId() }] })),

      updateTrooper: (id, patch) => set((s) => ({
        troopers: s.troopers.map(t => t.id === id ? clampTrooper({ ...t, ...patch }) : t),
      })),

      deleteTrooper: (id) => set((s) => ({ troopers: s.troopers.filter(t => t.id !== id) })),

      prepareMission: () => set((s) => ({
        troopers: s.troopers.map(t => t.active ? resetTrooperForMission(t) : t),
        mission: s.mission ?? { ...DEFAULT_MISSION, id: newId() },
      })),

      setMission: (patch) => set((s) => ({
        mission: s.mission ? { ...s.mission, ...patch, momentum: 'momentum' in patch ? clampMomentum(patch.momentum!) : s.mission.momentum } : null,
      })),

      resetMission: () => set((s) => ({
        mission: { ...DEFAULT_MISSION, id: newId() },
        troopers: s.troopers.map(t => t.active ? resetTrooperForMission(t) : t),
      })),

      applyAdvanceResult: ({ result, trooperOffpos }) => set((s) => {
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
      }),

      addRoll: (roll) => set((s) => ({
        diceHistory: [roll, ...s.diceHistory].slice(0, DICE_HISTORY_CAP),
      })),

      clearHistory: () => set({ diceHistory: [] }),

      setView: (v) => set({ currentView: v }),
      setDiceTrayOpen: (open) => set({ diceTrayOpen: open }),

      // ── Sector actions ──────────────────────────────────────────────────────

      addSector: (sector) => set((s) => {
        if (!s.mission) return s
        return {
          mission: {
            ...s.mission,
            sectors: [...s.mission.sectors, { ...sector, id: newId(), status: 'pending' as const }],
          },
        }
      }),

      updateSector: (id, patch) => set((s) => {
        if (!s.mission) return s
        return {
          mission: {
            ...s.mission,
            sectors: s.mission.sectors.map(sec => sec.id === id ? { ...sec, ...patch } : sec),
          },
        }
      }),

      deleteSector: (id) => set((s) => {
        if (!s.mission) return s
        // Do not delete active sector
        if (s.mission.activeSectorId === id) return s
        return {
          mission: {
            ...s.mission,
            sectors: s.mission.sectors.filter(sec => sec.id !== id),
          },
        }
      }),

      setActiveSector: (id) => set((s) => {
        if (!s.mission) return s
        const target = s.mission.sectors.find(sec => sec.id === id)
        // Cleared sectors are terminal — clicking the chip is a no-op so the
        // user can't silently reopen them. The ✎ button still edits.
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
              // Only demote if the previously-active sector is still 'active'.
              // A cleared sector that happened to also be activeSectorId stays cleared.
              if (sec.status === 'active') return { ...sec, status: 'pending' as const }
              return sec
            }),
          },
        }
      }),

      // ── Mission phase ────────────────────────────────────────────────────────

      setMissionPhase: (phase) => set((s) => {
        if (!s.mission) return s
        return { mission: { ...s.mission, phase } }
      }),

      // ── Engagement lifecycle ─────────────────────────────────────────────────

      beginEngagement: () => set((s) => {
        if (!s.mission) return s
        return {
          mission: {
            ...s.mission,
            phase: 'engagement' as const,
            engagement: initialEngagementState(),
          },
        }
      }),

      updateEngagement: (patch) => set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        return {
          mission: {
            ...s.mission,
            engagement: { ...s.mission.engagement, ...patch },
          },
        }
      }),

      setExchangeStep: (step) => set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        return {
          mission: {
            ...s.mission,
            engagement: { ...s.mission.engagement, step },
          },
        }
      }),

      setTrooperIntent: (trooperId, intent) => set((s) => {
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
      }),

      resolveOffenseRoll: (result) => set((s) => {
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
      }),

      resolveDefenseRoll: (trooperId, result) => set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        let nextTroopers = s.troopers
        let trooperDied = s.mission.engagement.trooperDiedLastExchange
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
      }),

      resolveEnemyTactics: ({ naturalD6, total: _total, tactic, repositionTrooperId, scatterTrooperId }) => set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        const eng = s.mission.engagement

        // 1. Pressure increase
        const activeSector = s.mission.sectors.find(sec => sec.id === s.mission!.activeSectorId)
        const pressureCap = activeSector ? activeSector.tl + 1 : 5
        const newPressure = pressureIncreases(naturalD6)
          ? Math.min(eng.pressure + 1, pressureCap)
          : eng.pressure

        // 2. Compute nextExchangeModifiers and trooper changes based on tactic
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
      }),

      beginNextExchange: () => set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        const eng = s.mission.engagement
        const mods = eng.nextExchangeModifiers

        // Apply flankingDefPenalty to troopers
        let nextTroopers = s.troopers
        if (mods.flankingDefPenalty.length > 0) {
          nextTroopers = s.troopers.map(t =>
            mods.flankingDefPenalty.includes(t.id) ? { ...t, def_modifier: t.def_modifier - 1 } : t,
          )
        }

        // Handle suppressed lifecycle: clear suppressed if trooper is fortified
        nextTroopers = nextTroopers.map(t =>
          t.active && t.suppressed && t.defpos === 'fortified' ? { ...t, suppressed: false } : t,
        )

        // Decrement radioStrikeCountdown
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
      }),

      endEngagement: (outcome) => set((s) => {
        if (!s.mission) return s
        // Victory clears the current sector. Defeat/disengage leave its status alone.
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
      }),

      endMission: () => set((s) => {
        if (!s.mission) return s
        return {
          mission: {
            ...s.mission,
            phase: 'mission_complete' as const,
            engagement: null,
          },
        }
      }),

      advanceToNextSector: () => set((s) => {
        if (!s.mission) return s
        return clearAndAdvanceMission(s.mission, s.troopers)
      }),

      // Used by overwhelm + bypass: same shape as advanceToNextSector but distinct
      // names so call-sites read self-explanatorily.
      overwhelmActiveSector: () => set((s) => {
        if (!s.mission) return s
        return clearAndAdvanceMission(s.mission, s.troopers)
      }),

      bypassActiveSector: () => set((s) => {
        if (!s.mission) return s
        return clearAndAdvanceMission(s.mission, s.troopers)
      }),

      clearTransition: () => set((s) => {
        if (!s.mission) return s
        return { mission: { ...s.mission, transitionFromSectorId: null } }
      }),

      // ── Hard targets & attached forces ──────────────────────────────────────

      applyHardTargetHit: (targetId, atCost, costTrooperId) => set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        const hitsToApply = 1
        const newTargets = s.mission.engagement.hardTargets
          .map(ht => ht.id === targetId ? { ...ht, currentHp: ht.currentHp - hitsToApply } : ht)
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
      }),

      updatePressure: (delta) => set((s) => {
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
      }),

      commitAttachedForce: (forceId) => set((s) => {
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
      }),

      resolveAttachedForceDice: (forceId, results) => set((s) => {
        if (!s.mission || !s.mission.engagement) return s
        const losses = results.filter(r => r === 1).length
        const updatedForces = s.mission.engagement.attachedForces
          .map(af => {
            if (af.id !== forceId) return af
            const newDice = af.dice - losses
            return { ...af, dice: newDice }
          })
          .filter(af => af.dice > 0)

        return {
          mission: {
            ...s.mission,
            engagement: { ...s.mission.engagement, attachedForces: updatedForces },
          },
        }
      }),

      addHardTarget: (ht) => set((s) => {
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
      }),

      addAttachedForce: (af) => set((s) => {
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
      }),

      nullifyTactic: (trooperId) => set((s) => {
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
      }),

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
        } catch (e) {
          throw new Error('Invalid import: data could not be applied')
        }
      },

      exportState: () => {
        const { troopers, mission, diceHistory } = get()
        return { troopers, mission, diceHistory }
      },
    }),
    {
      name: 'danger-close-app-state',
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        // Migration is cumulative: each block falls through to the next so that
        // a v0 user runs v1 → v2 → v3 in sequence. All blocks mutate the same
        // persistedState object via local casts; do not add early returns.
        if (version < 1) {
          const state = persistedState as Record<string, unknown>
          if (Array.isArray(state.troopers)) {
            state.troopers = (state.troopers as Record<string, unknown>[]).map(t => ({
              ...t,
              tag: t.tag ?? '',
              grit_max: t.grit_max ?? 3,
              ammo_max: t.ammo_max ?? 3,
              perks: t.perks ?? (t.perk ? [{ name: t.perk, description: '' }] : []),
              perk: undefined,
            }))
          }
        }
        if (version < 2) {
          const state = persistedState as Record<string, unknown>
          if (state.mission && typeof state.mission === 'object') {
            const m = state.mission as Record<string, unknown>
            if (m.sector && !m.sectors) {
              const oldSector = m.sector as Record<string, unknown>
              m.sectors = [{ id: 'sector-1', ...oldSector, status: 'active' }]
              m.activeSectorId = 'sector-1'
              delete m.sector
            } else if (!m.sectors) {
              m.sectors = [{ id: 'sector-1', name: 'Sector Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }]
              m.activeSectorId = 'sector-1'
            }
            m.phase = m.phase ?? 'advance'
            m.engagement = m.engagement ?? null
          }
        }
        if (version < 3) {
          const state = persistedState as Record<string, unknown>
          if (state.mission && typeof state.mission === 'object') {
            const m = state.mission as Record<string, unknown>
            if (m.transitionFromSectorId === undefined) {
              m.transitionFromSectorId = null
            }
          }
        }
        return persistedState as Record<string, unknown>
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        troopers: s.troopers,
        mission: s.mission,
        diceHistory: s.diceHistory,
      // cast required: Zustand's partialize types expect the full Store back,
      // but we intentionally return a subset — this is the standard workaround
      }) as unknown as Store,
    },
  ),
)

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AppState, Trooper, MissionState, DiceRoll, ApplyAdvancePayload, View,
} from '../types'
import { gearByName } from '../data/gear'
import {
  clampMomentum, clampGrit, clampAmmo, clampUses,
  defposForResult, momentumForResult, stealthShouldClear,
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
}

const DEFAULT_MISSION: MissionState = {
  id: 'current',
  name: 'Current Mission',
  sector: { name: 'Sector', cover: 1, space: 1, tl: 2, weather: 0 },
  momentum: 0,
  advance_rolls: 0,
  stealth: false,
  notes: '',
}

function maxUsesFor(gearName: string): number {
  const g = gearByName(gearName)
  if (!g || g.max_uses < 0) return -1
  return g.max_uses
}

function resetTrooperForMission(t: Trooper): Trooper {
  return {
    ...t,
    grit: 3,
    ammo: 3,
    status: 'ok',
    offpos: 'engaged',
    defpos: 'incover',
    suppressed: false,
    def_modifier: 0,
    special_weapon_uses: t.special_weapon ? maxUsesFor(t.special_weapon) : -1,
    special_gear_uses: t.special_gear ? maxUsesFor(t.special_gear) : -1,
  }
}

function clampTrooper(t: Trooper): Trooper {
  const swMax = t.special_weapon ? maxUsesFor(t.special_weapon) : -1
  const sgMax = t.special_gear ? maxUsesFor(t.special_gear) : -1
  return {
    ...t,
    grit: clampGrit(t.grit),
    ammo: clampAmmo(t.ammo),
    special_weapon_uses: clampUses(t.special_weapon_uses, swMax),
    special_gear_uses: clampUses(t.special_gear_uses, sgMax),
  }
}

const DICE_HISTORY_CAP = 20

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

      resetMission: () => set(() => ({ mission: { ...DEFAULT_MISSION, id: newId() } })),

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
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        troopers: s.troopers,
        mission: s.mission,
        diceHistory: s.diceHistory,
      // cast required: Zustand's partialize types expect the full Store back,
      // but we intentionally return a subset — this is the standard workaround
      }) as unknown as Store,
      version: 1,
    },
  ),
)

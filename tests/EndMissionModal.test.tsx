import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useStore } from '../src/store'
import EndMissionModal from '../src/views/MissionBoard/EndMissionModal'
import type { MissionState, Trooper } from '../src/types'

const completeMissionMock = vi.fn(async () => undefined)

vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client')>('../src/api/client')
  return { ...actual }
})

function makeTrooper(id: string, opts: Partial<Trooper> = {}): Trooper {
  return {
    id, name: `Trooper ${id}`, fullname: '', callsign: '',
    perkpoints: 0, mobility: 4, armor: '', weapon: '', special_weapon: '', special_gear: '',
    tag: '', perks: [], notes: '', squadId: 'sq1', recovering: false, wasBleedingOut: false,
    grit: 3, grit_max: 3, ammo: 3, ammo_max: 3,
    status: 'ok', offpos: 'engaged', defpos: 'incover',
    suppressed: false, def_modifier: 0, special_weapon_uses: -1, special_gear_uses: -1,
    ...opts,
  }
}

function makeLiveMission(): MissionState {
  return {
    id: 'm1', name: 'Test Op',
    sectors: [{ id: 's1', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }],
    activeSectorId: 's1', phase: 'catch_breath', engagement: null,
    momentum: 1, advance_rolls: 2, stealth: false, notes: '',
    transitionFromSectorId: null, squadId: 'sq1',
  }
}

function resetStore() {
  useStore.setState({
    troopers: [
      makeTrooper('t1'),
      makeTrooper('t2', { status: 'wounded' }),
      makeTrooper('t3', { status: 'dead' }),
    ],
    mission: makeLiveMission(),
    missions: [{ id: 'm1', campaignId: 'c1', status: 'live', name: 'Test Op', squadId: 'sq1' }],
    diceHistory: [], squads: [],
    currentCampaignId: 'c1',
    campaigns: [{ id: 'c1', name: 'Camp', description: '', created_at: '', req: 0, reqEnabled: false, defaultAirspace: 'contested' }],
    authStatus: 'authenticated',
    user: { username: 'u' },
    currentView: 'mission', diceTrayOpen: false, builderMissionId: null,
    completeMission: completeMissionMock,
  } as Parameters<typeof useStore.setState>[0])
}

describe('EndMissionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  it('renders outcome selector and survivor list', () => {
    render(<EndMissionModal open={true} onClose={() => {}} />)
    expect(screen.getByText('VICTORY')).toBeInTheDocument()
    expect(screen.getByText('DEFEAT')).toBeInTheDocument()
    expect(screen.getByText('ABORTED')).toBeInTheDocument()
    // 2 survivors (ok + wounded), 1 dead
    expect(screen.getByText(/SURVIVORS \(2\)/)).toBeInTheDocument()
    expect(screen.getByText(/LOST \(1\)/)).toBeInTheDocument()
  })

  it('confirm button calls completeMission with selected outcome and field report', async () => {
    render(<EndMissionModal open={true} onClose={() => {}} />)

    // Select defeat outcome
    fireEvent.click(screen.getByText('DEFEAT'))

    // Fill field report
    const textarea = screen.getByPlaceholderText(/After-action notes/)
    fireEvent.change(textarea, { target: { value: 'We failed.' } })

    // Confirm
    fireEvent.click(screen.getByText('CONFIRM END MISSION'))

    await waitFor(() => {
      expect(completeMissionMock).toHaveBeenCalledWith('m1', {
        fieldReport: 'We failed.',
        outcome: 'defeat',
      })
    })
  })

  it('shows REQ preview when reqEnabled', () => {
    useStore.setState({
      campaigns: [{ id: 'c1', name: 'Camp', description: '', created_at: '', req: 5, reqEnabled: true, defaultAirspace: 'contested' }],
    })
    render(<EndMissionModal open={true} onClose={() => {}} />)
    expect(screen.getByText(/REQ AWARD/)).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()  // 2 survivors
  })
})

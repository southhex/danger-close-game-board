import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useStore } from '../src/store'
import MissionBoard from '../src/views/MissionBoard/MissionBoard'
import type { MissionState } from '../src/types'

vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client')>('../src/api/client')
  return { ...actual }
})

function makeLiveMission(phase: MissionState['phase'] = 'advance'): MissionState {
  return {
    id: 'm1',
    name: 'Test Op',
    sectors: [{ id: 's1', name: 'Sector Alpha', cover: 1, space: 1, tl: 2, weather: 0, status: 'active' }],
    activeSectorId: 's1',
    phase,
    engagement: null,
    momentum: 0,
    advance_rolls: 0,
    stealth: false,
    notes: '',
    transitionFromSectorId: null,
    squadId: 'sq1',
  }
}

function resetStore(mission: MissionState | null = null) {
  useStore.setState({
    troopers: [],
    mission,
    diceHistory: [],
    squads: [],
    missions: [],
    currentCampaignId: 'c1',
    campaigns: [{ id: 'c1', name: 'Camp', description: '', created_at: '', req: 0, reqEnabled: false, defaultAirspace: 'contested' }],
    authStatus: 'authenticated',
    user: { username: 'u' },
    currentView: 'mission',
    diceTrayOpen: false,
    builderMissionId: null,
  })
}

describe('MissionBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  it('shows no-active-mission message when mission is null', () => {
    render(<MissionBoard />)
    expect(screen.getByText('NO ACTIVE MISSION')).toBeInTheDocument()
  })

  it('shows AdvanceRollPanel when mission phase is advance', () => {
    resetStore(makeLiveMission('advance'))
    render(<MissionBoard />)
    expect(screen.getByText('ADVANCE ROLL')).toBeInTheDocument()
    expect(screen.getByText('ROLL 2D6 ▸')).toBeInTheDocument()
  })

  it('does not show AdvanceRollPanel when phase is engagement', () => {
    resetStore(makeLiveMission('engagement'))
    render(<MissionBoard />)
    expect(screen.queryByText('ADVANCE ROLL')).not.toBeInTheDocument()
    expect(screen.queryByText('ROLL 2D6 ▸')).not.toBeInTheDocument()
  })
})

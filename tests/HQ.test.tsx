import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useStore } from '../src/store'
import HQ from '../src/views/HQ/HQ'
import type { Mission, Squad, Trooper, Campaign } from '../src/types'

vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client')>('../src/api/client')
  return {
    ...actual,
    patchCampaignSettingsApi: vi.fn(async () => undefined),
    deleteMissionApi: vi.fn(async () => undefined),
    patchMissionFieldReportApi: vi.fn(async () => undefined),
  }
})

function mkCampaign(p?: Partial<Campaign>): Campaign {
  return {
    id: 'c1', name: 'Test Campaign', description: 'A test', created_at: '',
    req: 5, reqEnabled: true, defaultAirspace: 'contested',
    ...p,
  }
}

function mkSquad(p: Partial<Squad> & { id: string }): Squad {
  return {
    id: p.id, campaignId: 'c1', name: p.name ?? 'Alpha', callsign: p.callsign ?? '',
    sergeantId: null, perks: [], notes: '', ...p,
  }
}

function mkTrooper(p: Partial<Trooper> & { id: string }): Trooper {
  return {
    id: p.id, name: p.name ?? 'X', fullname: '', callsign: '',
    perkpoints: 0, mobility: 4, armor: '', weapon: '', special_weapon: '',
    special_gear: '', tag: '', perks: [], notes: '',
    squadId: p.squadId ?? null, recovering: p.recovering ?? false,
    grit: 3, grit_max: 3, ammo: 3, ammo_max: 3,
    status: 'ok', offpos: 'engaged', defpos: 'incover',
    suppressed: false, def_modifier: 0,
    special_weapon_uses: -1, special_gear_uses: -1,
    ...p,
  }
}

function mkMission(p: Partial<Mission> & { id: string }): Mission {
  return {
    id: p.id, campaignId: 'c1', status: 'blueprint', name: p.name ?? 'Op',
    difficulty: 'routine', objectiveCategory: 'seize_secure',
    ...p,
  }
}

function resetStore(overrides = {}) {
  useStore.setState({
    troopers: [],
    squads: [],
    missions: [],
    mission: null,
    currentCampaignId: 'c1',
    campaigns: [mkCampaign()],
    authStatus: 'authenticated',
    user: { username: 'u' },
    currentView: 'hq',
    diceTrayOpen: false,
    builderMissionId: null,
    ...overrides,
  })
}

describe('HQ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  it('renders campaign overview card with name', () => {
    render(<HQ />)
    expect(screen.getByDisplayValue('Test Campaign')).toBeInTheDocument()
  })

  it('renders Available Missions section with + NEW MISSION button', () => {
    render(<HQ />)
    expect(screen.getByText('Available Missions')).toBeInTheDocument()
    expect(screen.getByText('+ NEW MISSION')).toBeInTheDocument()
  })

  it('+ NEW MISSION calls openMissionBuilder(null) and navigates to builder', () => {
    render(<HQ />)
    fireEvent.click(screen.getByText('+ NEW MISSION'))
    expect(useStore.getState().currentView).toBe('builder')
    expect(useStore.getState().builderMissionId).toBeNull()
  })

  it('shows blueprint mission and clicking EDIT opens builder with mission id', () => {
    resetStore({
      missions: [mkMission({ id: 'm1', name: 'Op Alpha', status: 'blueprint' })],
    })
    render(<HQ />)
    expect(screen.getByText('Op Alpha')).toBeInTheDocument()
    // Click the mission card to open modal
    fireEvent.click(screen.getByText('Op Alpha'))
    // Click EDIT in the modal
    fireEvent.click(screen.getByText('EDIT'))
    expect(useStore.getState().currentView).toBe('builder')
    expect(useStore.getState().builderMissionId).toBe('m1')
  })

  it('shows Mission History section for completed missions', () => {
    resetStore({
      missions: [mkMission({
        id: 'm2', name: 'Old Recon', status: 'completed',
        outcome: 'victory', completed_at: '2026-01-01T00:00:00Z',
      })],
    })
    render(<HQ />)
    expect(screen.getByText('Mission History')).toBeInTheDocument()
    expect(screen.getByText('Old Recon')).toBeInTheDocument()
  })

  it('clicking a completed mission opens FieldReportPanel', () => {
    resetStore({
      missions: [mkMission({
        id: 'm3', name: 'Strike Op', status: 'completed',
        outcome: 'defeat', completed_at: '2026-02-01T00:00:00Z',
      })],
    })
    render(<HQ />)
    fireEvent.click(screen.getByText('Strike Op'))
    expect(screen.getAllByText('Field Report').length).toBeGreaterThan(0)
  })

  it('renders squad roster when squads exist', () => {
    resetStore({
      squads: [mkSquad({ id: 'sq1', name: 'Bravo' })],
      troopers: [mkTrooper({ id: 't1', squadId: 'sq1', recovering: true })],
    })
    render(<HQ />)
    expect(screen.getByText('Squads')).toBeInTheDocument()
    expect(screen.getByText('Bravo')).toBeInTheDocument()
    expect(screen.getByText(/1 rec/)).toBeInTheDocument()
  })

  it('shows no-blueprints placeholder when none exist', () => {
    render(<HQ />)
    expect(screen.getByText(/No blueprints/)).toBeInTheDocument()
  })

  it('does not show Mission History when there are no completed missions', () => {
    render(<HQ />)
    expect(screen.queryByText('Mission History')).not.toBeInTheDocument()
  })
})

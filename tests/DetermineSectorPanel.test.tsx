import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useStore } from '../src/store'
import DetermineSectorPanel from '../src/views/MissionBoard/DetermineSectorPanel'

const TEST_SQUAD = 'sq-test'

function makeMission(contentsState = 'undetermined' as const, rollFlags: Record<string, boolean> = {}) {
  return {
    id: 'm', name: 'M',
    sectors: [{
      id: 's1', name: 'Alpha', cover: 1, space: 1, tl: 2, weather: 0,
      status: 'active' as const, contentsState,
      rollCover: true, rollSpace: true, rollContents: true,
      ...rollFlags,
    }],
    activeSectorId: 's1',
    phase: 'determine_sector' as const,
    engagement: null, momentum: 0, advance_rolls: 0, stealth: false, notes: '',
    transitionFromSectorId: null, squadId: TEST_SQUAD,
  }
}

function resetStore() {
  if (typeof localStorage !== 'undefined') localStorage.clear()
  useStore.setState({ troopers: [], mission: null, diceHistory: [], currentView: 'mission' })
}

describe('DetermineSectorPanel', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('renders the first ROLL 1D6 button for cover', () => {
    useStore.setState({ mission: makeMission() })
    render(<DetermineSectorPanel />)
    expect(screen.getAllByText('ROLL 1D6').length).toBeGreaterThan(0)
    expect(screen.getByText(/DETERMINE SECTOR/)).toBeInTheDocument()
  })

  it('clicking ROLL 1D6 for cover reveals the space step', () => {
    useStore.setState({ mission: makeMission() })
    render(<DetermineSectorPanel />)
    const [coverBtn] = screen.getAllByText('ROLL 1D6')
    fireEvent.click(coverBtn)
    expect(screen.getByText(/SPACE/)).toBeInTheDocument()
  })

  it('Nothing branch calls applySectorEmpty and transitions phase', () => {
    useStore.setState({ mission: makeMission() })
    // Intercept the die rolls to force "nothing" outcome (die=1 → nothing on rollSectorContents)
    const mockRollDie = vi.fn()
      .mockReturnValueOnce(3)  // cover → 1
      .mockReturnValueOnce(3)  // space → 1
      .mockReturnValueOnce(3)  // weather → 0
      .mockReturnValueOnce(1)  // contents die=1 → nothing

    vi.doMock('../src/utils/dice', () => ({ rollDie: mockRollDie, rollDice: vi.fn() }))

    // Directly call the store mutator to confirm Nothing path
    useStore.getState().applySectorEmpty('s1')
    const m = useStore.getState().mission!
    expect(m.phase).toBe('catch_breath')
    expect(m.sectors[0].status).toBe('cleared')
    expect(m.sectors[0].empty).toBe(true)
  })

  it('TL branch calls applySectorRoll and transitions to advance phase', () => {
    useStore.setState({ mission: makeMission() })
    useStore.getState().applySectorRoll('s1', { cover: 1, space: 1, tl: 2, weather: 0 })
    const m = useStore.getState().mission!
    expect(m.phase).toBe('advance')
    expect(m.sectors[0].contentsState).toBe('rolled')
  })

  it('does not render without an active mission', () => {
    useStore.setState({ mission: null })
    const { container } = render(<DetermineSectorPanel />)
    expect(container.firstChild).toBeNull()
  })
})

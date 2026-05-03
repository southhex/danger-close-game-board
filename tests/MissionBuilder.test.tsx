import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import type { Mission } from '../src/types'

vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client')>('../src/api/client')
  return {
    ...actual,
    createMissionApi: vi.fn(async (campaignId: string, input: Omit<Mission, 'id' | 'campaignId' | 'status' | 'created_at' | 'completed_at'>) => ({
      id: 'm-new',
      campaignId,
      status: 'blueprint' as const,
      ...input,
    })),
    patchMissionBlueprintApi: vi.fn(async (mission: Mission) => mission),
  }
})

import { useStore } from '../src/store'
import * as api from '../src/api/client'
import MissionBuilder from '../src/views/MissionBuilder/MissionBuilder'
import { ToastProvider } from '../src/components/Toast'

function reset() {
  useStore.setState({
    troopers: [], mission: null, diceHistory: [],
    squads: [], missions: [],
    currentCampaignId: 'c1',
    campaigns: [{ id: 'c1', name: 'Camp', description: '', created_at: '', defaultAirspace: 'contested', reqEnabled: false, req: 0 }],
    authStatus: 'authenticated',
    user: { username: 'u' },
    currentView: 'builder',
    diceTrayOpen: false,
    builderMissionId: null,
  })
}

function renderBuilder() {
  return render(<ToastProvider><MissionBuilder /></ToastProvider>)
}

describe('MissionBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reset()
  })

  it('renders default sectors (LZ + Objective) and required sections', () => {
    renderBuilder()
    expect(screen.getByText('Sector Chain')).toBeTruthy()
    expect(screen.getAllByPlaceholderText('Sector name')).toHaveLength(2)
    expect(screen.getByLabelText(/Roll difficulty/i)).toBeTruthy()
  })

  it('shows error and disables save when name is missing', () => {
    renderBuilder()
    const save = screen.getByRole('button', { name: /CREATE BLUEPRINT/i }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
    expect(screen.getByText(/Mission name required/i)).toBeTruthy()
  })

  it('saves blueprint with valid form', async () => {
    renderBuilder()
    const nameInput = screen.getByPlaceholderText('Mission name') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Operation Hammer' } })

    const save = screen.getByRole('button', { name: /CREATE BLUEPRINT/i }) as HTMLButtonElement
    expect(save.disabled).toBe(false)
    fireEvent.click(save)

    await waitFor(() => expect(api.createMissionApi).toHaveBeenCalledOnce())
    const callArgs = (api.createMissionApi as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(callArgs[0]).toBe('c1')
    expect(callArgs[1].name).toBe('Operation Hammer')
    expect(callArgs[1].sectors).toHaveLength(2)
    expect(callArgs[1].sectors.find((s: { role: string }) => s.role === 'lz')).toBeTruthy()
    expect(callArgs[1].sectors.find((s: { role: string }) => s.role === 'objective')).toBeTruthy()
  })

  it('hit-and-run subtype enforces EZ requirement', () => {
    renderBuilder()
    fireEvent.change(screen.getByPlaceholderText('Mission name'), { target: { value: 'Raid Op' } })
    const categorySelect = screen.getByDisplayValue('Seize & Secure') as HTMLSelectElement
    fireEvent.change(categorySelect, { target: { value: 'hit_run' } })
    // After category change, the first subtype is auto-selected (Raid). EZ unset → error expected.
    expect(screen.getByText(/Hit & Run subtypes require an EZ/i)).toBeTruthy()
    const save = screen.getByRole('button', { name: /CREATE BLUEPRINT/i }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
  })

  it('rejects when no LZ sector', () => {
    renderBuilder()
    fireEvent.change(screen.getByPlaceholderText('Mission name'), { target: { value: 'Op' } })
    const lzCard = screen.getAllByPlaceholderText('Sector name')[0].closest('div.bg-bg')!
    const deleteBtn = within(lzCard as HTMLElement).getByLabelText('Delete sector')
    fireEvent.click(deleteBtn)
    expect(screen.getByText(/Exactly one LZ sector required/i)).toBeTruthy()
  })

  it('hydrates from existing blueprint when builderMissionId set', () => {
    useStore.setState({
      missions: [{
        id: 'm1', campaignId: 'c1', status: 'blueprint', name: 'Saved Op',
        difficulty: 'hazardous', objectiveCategory: 'defensive', objectiveSubtype: 'siege',
        airspace: 'denied', defaultWeather: -1, stealthStart: true,
        insertion: { lz: 'ground', ez: null },
        sectors: [
          { id: 's1', name: 'LZ-A', role: 'lz', contentsState: 'predetermined', cover: 1, space: 1, tl: 2, weather: -1, status: 'pending' },
          { id: 's2', name: 'Obj',  role: 'objective', contentsState: 'undetermined', cover: 1, space: 1, tl: 2, weather: -1, status: 'pending' },
        ],
      }],
      builderMissionId: 'm1',
    })
    renderBuilder()
    expect((screen.getByPlaceholderText('Mission name') as HTMLInputElement).value).toBe('Saved Op')
    const sectorInputs = screen.getAllByPlaceholderText('Sector name') as HTMLInputElement[]
    expect(sectorInputs[0].value).toBe('LZ-A')
    expect(sectorInputs[1].value).toBe('Obj')
    expect(screen.getByRole('button', { name: /SAVE BLUEPRINT/i })).toBeTruthy()
  })
})

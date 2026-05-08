import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useStore } from '../src/store'
import Armoury from '../src/views/Armoury/Armoury'
import type { Campaign, Trooper } from '../src/types'

vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client')>('../src/api/client')
  return {
    ...actual,
    patchReqApi: vi.fn(async () => undefined),
    spendReqApi: vi.fn(async (_: string, body: { amount: number }) => ({
      req: Math.max(0, 5 - body.amount),
    })),
  }
})

import * as api from '../src/api/client'

function mkCampaign(p?: Partial<Campaign>): Campaign {
  return {
    id: 'c1', name: 'Test Campaign', description: '', created_at: '',
    req: 5, reqEnabled: true, defaultAirspace: 'contested',
    ...p,
  }
}

function mkTrooper(p: Partial<Trooper> & { id: string }): Trooper {
  return {
    id: p.id, name: p.id, fullname: 'Full Name', callsign: p.callsign ?? 'Alpha-1',
    perkpoints: 0, mobility: 4, armor: 'Light Armor', weapon: 'Assault Rifle',
    special_weapon: '', special_gear: '', tag: '', perks: [], notes: '',
    squadId: 's1', recovering: false,
    grit: 3, grit_max: 3, ammo: 3, ammo_max: 3,
    status: 'ok', offpos: 'engaged', defpos: 'incover',
    suppressed: false, def_modifier: 0,
    special_weapon_uses: -1, special_gear_uses: -1,
    ...p,
  }
}

function resetStore(overrides = {}) {
  useStore.setState({
    troopers: [mkTrooper({ id: 't1', callsign: 'Alpha-1' })],
    squads: [],
    missions: [],
    mission: null,
    currentCampaignId: 'c1',
    campaigns: [mkCampaign()],
    authStatus: 'authenticated',
    user: { username: 'u' },
    currentView: 'armoury',
    diceTrayOpen: false,
    builderMissionId: null,
    ...overrides,
  })
}

describe('Armoury', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  it('renders REQ pool when reqEnabled', () => {
    render(<Armoury />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('REQ')).toBeInTheDocument()
    expect(screen.getByText('REQ Pool')).toBeInTheDocument()
  })

  it('hides REQ panel when reqEnabled is false', () => {
    resetStore({ campaigns: [mkCampaign({ reqEnabled: false })] })
    render(<Armoury />)
    expect(screen.queryByText('REQ Pool')).not.toBeInTheDocument()
  })

  it('renders gear type sections', () => {
    render(<Armoury />)
    expect(screen.getByText('Armor')).toBeInTheDocument()
    expect(screen.getByText('Weapon')).toBeInTheDocument()
    expect(screen.getByText('Special Weapon')).toBeInTheDocument()
    expect(screen.getByText('Special Equipment')).toBeInTheDocument()
  })

  it('BUY buttons show SELECT TROOPER before picker used', () => {
    render(<Armoury />)
    const buyBtns = screen.getAllByText('SELECT TROOPER')
    expect(buyBtns.length).toBeGreaterThan(0)
  })

  it('disables BUY when REQ insufficient for item', () => {
    // LMG costs 1 REQ; set pool to 0
    resetStore({ campaigns: [mkCampaign({ req: 0 })] })
    render(<Armoury />)

    // Select a trooper so BUY becomes relevant
    const picker = screen.getByRole('combobox')
    fireEvent.change(picker, { target: { value: 't1' } })

    // LMG (reqcost=1) should be disabled with INSUFFICIENT REQ
    expect(screen.getAllByText('INSUFFICIENT REQ').length).toBeGreaterThan(0)
  })

  it('ASSIGN label shows when reqEnabled false (no cost check)', () => {
    resetStore({ campaigns: [mkCampaign({ reqEnabled: false })] })
    render(<Armoury />)
    const picker = screen.getByRole('combobox')
    fireEvent.change(picker, { target: { value: 't1' } })
    // With REQ disabled all gear should show ASSIGN (no cost, no check)
    const assignBtns = screen.getAllByText('ASSIGN')
    expect(assignBtns.length).toBeGreaterThan(0)
  })

  it('opens confirm dialog on BUY and calls spendReq on confirm', async () => {
    render(<Armoury />)
    const picker = screen.getByRole('combobox')
    fireEvent.change(picker, { target: { value: 't1' } })

    // Find "Assault Rifle" section and click its BUY/ASSIGN button
    // Assault Rifle has reqcost=0 so it should show "ASSIGN"
    const btns = screen.getAllByText('ASSIGN')
    fireEvent.click(btns[0])

    // Confirm dialog should open
    expect(screen.getByText('Confirm Assignment')).toBeInTheDocument()

    // Click CONFIRM
    const confirmBtn = screen.getByText('CONFIRM')
    fireEvent.click(confirmBtn)

    // spendReqApi should be called
    await vi.waitFor(() => {
      expect(api.spendReqApi).toHaveBeenCalledTimes(1)
    })
  })
})

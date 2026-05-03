import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useStore } from '../src/store'
import Barracks from '../src/views/Barracks/Barracks'
import type { Trooper, Squad } from '../src/types'

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

function mkSquad(p: Partial<Squad> & { id: string }): Squad {
  return {
    id: p.id, campaignId: 'c1', name: p.name ?? 'Alpha', callsign: '',
    sergeantId: null, perks: [], notes: '', ...p,
  }
}

describe('Barracks', () => {
  beforeEach(() => {
    useStore.setState({
      troopers: [],
      squads: [],
      mission: null,
      currentCampaignId: 'c1',
      authStatus: 'authenticated',
    })
  })

  it('renders squad sections, member counts and unassigned pool', () => {
    useStore.setState({
      squads: [mkSquad({ id: 'sq1', name: 'Alpha' }), mkSquad({ id: 'sq2', name: 'Bravo' })],
      troopers: [
        mkTrooper({ id: 't1', name: 'Ash',  squadId: 'sq1' }),
        mkTrooper({ id: 't2', name: 'Bri',  squadId: 'sq1' }),
        mkTrooper({ id: 't3', name: 'Cy',   squadId: null }),
      ],
    })
    render(<Barracks />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Bravo')).toBeInTheDocument()
    expect(screen.getByText(/2\/5/)).toBeInTheDocument()
    expect(screen.getByText(/UNASSIGNED \(1\)/)).toBeInTheDocument()
  })

  it('shows recovering badge on a recovering trooper', () => {
    useStore.setState({
      squads: [mkSquad({ id: 'sq1' })],
      troopers: [mkTrooper({ id: 't1', name: 'Ash', squadId: 'sq1', recovering: true })],
    })
    render(<Barracks />)
    expect(screen.getByText(/Recovering/i)).toBeInTheDocument()
  })

  it('flags a full squad in the count display', () => {
    useStore.setState({
      squads: [mkSquad({ id: 'sq1' })],
      troopers: Array.from({ length: 5 }, (_, i) =>
        mkTrooper({ id: `t${i}`, name: `T${i}`, squadId: 'sq1' }),
      ),
    })
    render(<Barracks />)
    expect(screen.getByText(/5\/5/)).toBeInTheDocument()
  })
})

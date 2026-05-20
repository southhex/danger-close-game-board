import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HardTargetPanel from '../src/views/MissionBoard/HardTargetPanel'
import type { HardTarget } from '../src/types'

function ht(overrides: Partial<HardTarget> & { id: string; type: HardTarget['type'] }): HardTarget {
  return {
    name: 'X', maxHp: 1, currentHp: 1, isGround: false, ...overrides,
  } as HardTarget
}

describe('HardTargetPanel — SRD detail on cards', () => {
  it('renders damage line and notes for each HT type', () => {
    const targets: HardTarget[] = [
      ht({ id: '1', type: 'brute', name: 'Bruno' }),
      ht({ id: '2', type: 'sniper', name: 'Spotter' }),
      ht({ id: '3', type: 'grenadier', name: 'Boom' }),
      ht({ id: '4', type: 'gun_nest', name: 'Nest', maxHp: 2, currentHp: 2 }),
      ht({ id: '5', type: 'tank', name: 'T-72', maxHp: 4, currentHp: 4, isGround: true }),
    ]
    render(<HardTargetPanel hardTargets={targets} />)

    // Damage lines (verbatim from SRD)
    expect(screen.getByText('−1 DEF to 2 Troopers')).toBeInTheDocument()
    expect(screen.getAllByText('−2 DEF to 1 Trooper')).toHaveLength(2) // sniper + grenadier
    expect(screen.getByText('−1 DEF to 1 Trooper')).toBeInTheDocument()
    expect(screen.getByText('−1 DEF to all Troopers')).toBeInTheDocument()

    // Notes
    expect(screen.getByText('Prefers Flanked targets.')).toBeInTheDocument()
    expect(screen.getByText('Prefers Fortified targets.')).toBeInTheDocument()
    expect(screen.getByText('Prefers Flanking targets.')).toBeInTheDocument()
    expect(
      screen.getByText('Mobile. Can appear during Engagement. Attacks every other Exchange.'),
    ).toBeInTheDocument()
  })

  it('shows GROUND badge for tank and disables HIT when destroyed', () => {
    const targets: HardTarget[] = [
      ht({ id: '1', type: 'tank', name: 'Killed', maxHp: 4, currentHp: 0, isGround: true }),
    ]
    render(<HardTargetPanel hardTargets={targets} />)
    expect(screen.getByText('GROUND')).toBeInTheDocument()
    const hit = screen.getByText('HIT') as HTMLButtonElement
    expect(hit.disabled).toBe(true)
  })

  it('empty state when no hard targets', () => {
    render(<HardTargetPanel hardTargets={[]} />)
    expect(screen.getByText('No hard targets')).toBeInTheDocument()
  })
})

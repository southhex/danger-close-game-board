import { describe, it, expect } from 'vitest'
import { rollDie, rollDice } from '../src/utils/dice'

describe('dice', () => {
  it('rollDie returns 1..6', () => {
    for (let i = 0; i < 200; i++) {
      const r = rollDie()
      expect(r).toBeGreaterThanOrEqual(1)
      expect(r).toBeLessThanOrEqual(6)
    }
  })
  it('rollDice returns n results', () => {
    expect(rollDice(3)).toHaveLength(3)
  })
})

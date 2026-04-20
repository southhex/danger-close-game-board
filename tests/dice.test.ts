import { describe, it, expect } from 'vitest'
import { rollDie, rollDice, parseDiceNotation } from '../src/utils/dice'

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
  it('parseDiceNotation parses 2d6', () => {
    expect(parseDiceNotation('2d6')).toEqual({ count: 2, sides: 6 })
  })
  it('parseDiceNotation parses d6', () => {
    expect(parseDiceNotation('d6')).toEqual({ count: 1, sides: 6 })
  })
  it('parseDiceNotation throws on invalid notation', () => {
    expect(() => parseDiceNotation('abc')).toThrow('Invalid dice notation')
  })
})

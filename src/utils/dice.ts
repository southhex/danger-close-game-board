export function rollDie(sides = 6): number {
  return Math.floor(Math.random() * sides) + 1
}

export function rollDice(count: number, sides = 6): number[] {
  return Array.from({ length: count }, () => rollDie(sides))
}

export function parseDiceNotation(dice: string): { count: number; sides: number } {
  const m = dice.match(/^(\d*)d(\d+)$/)
  if (!m) throw new Error(`Invalid dice notation: ${dice}`)
  const count = m[1] === '' ? 1 : parseInt(m[1], 10)
  const sides = parseInt(m[2], 10)
  return { count, sides }
}

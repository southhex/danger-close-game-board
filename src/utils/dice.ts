export function rollDie(sides = 6): number {
  return Math.floor(Math.random() * sides) + 1
}

export function rollDice(count: number, sides = 6): number[] {
  return Array.from({ length: count }, () => rollDie(sides))
}

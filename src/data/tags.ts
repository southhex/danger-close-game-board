export interface TagItem {
  name: string
  description: string
}

export const TAGS: TagItem[] = [
  {
    name: 'Forceful',
    description: 'Physical solutions. Kicks doors, carries wounded, holds the line through brute effort. Intimidates when talking fails.',
  },
  {
    name: 'Technical',
    description: 'Systems and logic. Hacks terminals, disarms devices, reads schematics, operates unfamiliar equipment.',
  },
  {
    name: 'Steady',
    description: 'Composure and patience. Waits out a tense situation, resists interrogation, holds position for hours, talks down a panicking civilian.',
  },
  {
    name: 'Sharp',
    description: 'Reads people and situations. Notices the detail others miss, fast-talks past a checkpoint, picks up that something is wrong before anyone else does.',
  },
]

export function tagByName(name: string): TagItem | undefined {
  return TAGS.find(t => t.name === name)
}

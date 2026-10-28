// Områden — hämtas från datan (F3) i stället för en fast lista

import { AREAS } from './filters'

/**
 * Unika områden, sorterade i svensk ordning. Faller tillbaka på de kända
 * områdena om datan saknar områden helt.
 */
export function distinctAreas(values: (string | null | undefined)[]): string[] {
  const unique = new Map<string, string>()
  for (const value of values) {
    const area = value?.trim()
    if (area && !unique.has(area.toLowerCase())) unique.set(area.toLowerCase(), area)
  }
  const areas = Array.from(unique.values()).sort((a, b) => a.localeCompare(b, 'sv'))
  return areas.length > 0 ? areas : [...AREAS]
}

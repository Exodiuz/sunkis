// Dubblettkontroll vid inskick (C4)
// En bar räknas som trolig dubblett om namnen liknar varandra och den
// ligger närmare än 50 m — eller, utan koordinater, om namnet är detsamma.

import { distanceMeters } from './geo'

export const DUPLICATE_RADIUS_M = 50

type Candidate = { name: string; lat: number | null; lng: number | null }
type Existing = Candidate & { id: string }

// Ord som inte säger något om vilken bar det är
const STOP_WORDS = new Set(['the', 'bar', 'pub', 'krog', 'krogen', 'restaurang', 'och', '&'])

/**
 * "The Old Pub & Kök" → "old kok"
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(word => word && !STOP_WORDS.has(word))
    .join(' ')
}

export function namesSimilar(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  // Namn som bara består av tomma ord ("The Bar") jämförs i sin helhet
  if (!na || !nb) return a.trim().toLowerCase() === b.trim().toLowerCase()
  if (na === nb) return true
  if (Math.min(na.length, nb.length) >= 4 && (na.includes(nb) || nb.includes(na))) return true

  // Minst hälften av orden gemensamma
  const wa = new Set(na.split(' '))
  const wb = new Set(nb.split(' '))
  const shared = Array.from(wa).filter(w => wb.has(w)).length
  return shared > 0 && shared / Math.min(wa.size, wb.size) >= 0.5
}

/**
 * Returnerar befintliga barer som troligen är samma som kandidaten
 */
export function findDuplicates<T extends Existing>(candidate: Candidate, existing: T[]): T[] {
  return existing.filter(bar => {
    const hasCoords =
      candidate.lat !== null && candidate.lng !== null && bar.lat !== null && bar.lng !== null
    if (hasCoords) {
      const d = distanceMeters(
        { lat: candidate.lat as number, lng: candidate.lng as number },
        { lat: bar.lat as number, lng: bar.lng as number },
      )
      return d < DUPLICATE_RADIUS_M && namesSimilar(candidate.name, bar.name)
    }
    return normalizeName(candidate.name) === normalizeName(bar.name) && normalizeName(bar.name) !== ''
  })
}

/**
 * Ungefärlig ruta runt en punkt för databasfrågan (lite större än radien)
 */
export function boundingBox(lat: number, lng: number, radiusM = DUPLICATE_RADIUS_M * 1.2) {
  const dLat = radiusM / 111_320
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180))
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng }
}

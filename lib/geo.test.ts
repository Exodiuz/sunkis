import { describe, expect, it } from 'vitest'
import { distanceMeters, distanceToBar, formatDistance } from './geo'

const slussen = { lat: 59.3195, lng: 18.0722 }
const tCentralen = { lat: 59.3313, lng: 18.0597 }

describe('distanceMeters', () => {
  it('är 0 för samma punkt', () => {
    expect(distanceMeters(slussen, slussen)).toBe(0)
  })

  it('räknar ungefär rätt avstånd i Stockholm', () => {
    // Slussen → T-Centralen är drygt 1,4 km fågelvägen
    const d = distanceMeters(slussen, tCentralen)
    expect(d).toBeGreaterThan(1400)
    expect(d).toBeLessThan(1550)
  })

  it('är symmetrisk', () => {
    expect(distanceMeters(slussen, tCentralen)).toBeCloseTo(distanceMeters(tCentralen, slussen), 6)
  })
})

describe('distanceToBar', () => {
  it('returnerar null utan position eller koordinater', () => {
    expect(distanceToBar(null, slussen)).toBeNull()
    expect(distanceToBar(slussen, { lat: null, lng: 18 })).toBeNull()
  })
})

describe('formatDistance', () => {
  it('formaterar meter och kilometer', () => {
    expect(formatDistance(3)).toBe('10 m')
    expect(formatDistance(84)).toBe('80 m')
    expect(formatDistance(612)).toBe('600 m')
    expect(formatDistance(1234)).toBe('1,2 km')
    expect(formatDistance(2000)).toBe('2 km')
    expect(formatDistance(12_400)).toBe('12 km')
  })
})

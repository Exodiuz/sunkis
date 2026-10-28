import { describe, expect, it } from 'vitest'
import { directionsUrl, preferredMapsApp } from './directions'

describe('preferredMapsApp', () => {
  it('väljer Apple Maps på iOS och Google annars', () => {
    expect(preferredMapsApp('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('apple')
    expect(preferredMapsApp('Mozilla/5.0 (Linux; Android 15; Pixel 9)')).toBe('google')
  })
})

describe('directionsUrl', () => {
  it('bygger gånglänkar', () => {
    expect(directionsUrl(59.3135, 18.0809, 'google'))
      .toBe('https://www.google.com/maps/dir/?api=1&destination=59.3135%2C18.0809&travelmode=walking')
    expect(directionsUrl(59.3135, 18.0809, 'apple'))
      .toBe('https://maps.apple.com/?daddr=59.3135,18.0809&dirflg=w')
  })
})

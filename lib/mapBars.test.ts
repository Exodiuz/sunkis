import { describe, expect, it } from 'vitest'
import {
  barsInView,
  parsePinImageId,
  pinImageId,
  priceTier,
  toFeatureCollection,
  type MapBar,
} from './mapBars'

// Onsdag 28 oktober 2026 kl 18:00 (UTC+1)
const now = new Date('2026-10-28T18:00:00+01:00')

function bar(overrides: Partial<MapBar>): MapBar {
  return {
    id: overrides.name ?? 'x', name: 'Bar', area: 'Södermalm', address: null, lat: 59.31, lng: 18.07,
    opening_hours: null, price_40cl: null, price_50cl: null,
    happy_hour_price: null, happy_hour_start: null, happy_hour_end: null, happy_hour_days: null, happy_hour_size: null,
    sunk_factor: 0, sunk_votes: 0, price_confirmed_at: null, price_thumbs_up: 0, price_thumbs_down: 0,
    ...overrides,
  }
}

describe('priceTier', () => {
  it('följer legendens gränser', () => {
    expect(priceTier(null)).toBe('none')
    expect(priceTier(34)).toBe('cheap')
    expect(priceTier(35)).toBe('mid')
    expect(priceTier(55)).toBe('mid')
    expect(priceTier(56)).toBe('pricey')
  })
})

describe('pinImageId', () => {
  it('går att läsa tillbaka, även med | i etiketten', () => {
    const style = { tier: 'cheap' as const, happyHour: true, label: '29 kr', selected: false }
    expect(parsePinImageId(pinImageId(style))).toEqual(style)
    expect(parsePinImageId(pinImageId({ ...style, label: 'a|b' }))?.label).toBe('a|b')
  })

  it('ignorerar bilder som inte är nålar', () => {
    expect(parsePinImageId('bus-stop')).toBeNull()
    expect(parsePinImageId('pin|gold|-|-|1 kr')).toBeNull()
  })
})

describe('toFeatureCollection', () => {
  it('hoppar över barer utan koordinater och sorterar billigast först i kollisioner', () => {
    const fc = toFeatureCollection([
      bar({ name: 'Dyr', price_40cl: 69 }),
      bar({ name: 'Billig', price_50cl: 40 }), // 32 kr per 40 cl
      bar({ name: 'Okänd' }),
      bar({ name: 'Borta', lat: null, price_40cl: 30 }),
    ], now)
    expect(fc.features.map(f => f.properties.id)).toEqual(['Dyr', 'Billig', 'Okänd'])
    const [dyr, billig, okand] = fc.features.map(f => f.properties)
    expect(billig.sort).toBeLessThan(dyr.sort)
    expect(billig.tier).toBe('cheap')
    expect(dyr.tier).toBe('pricey')
    expect(okand).toMatchObject({ priced: false, tier: 'none' })
    expect(parsePinImageId(billig.pin)?.label).toBe('40 kr')
    expect(parsePinImageId(okand.pinSelected)).toMatchObject({ label: '?', selected: true })
  })

  it('markerar happy hour', () => {
    const fc = toFeatureCollection([
      bar({ price_40cl: 60, happy_hour_price: 39, happy_hour_start: '16:00', happy_hour_end: '19:00' }),
    ], now)
    expect(parsePinImageId(fc.features[0].properties.pin)).toMatchObject({ happyHour: true, label: '39 kr', tier: 'mid' })
  })
})

describe('barsInView', () => {
  const bounds = { west: 18.0, south: 59.3, east: 18.1, north: 59.35 }

  it('tar bara med barer i vyn, billigast först och barer utan pris sist', () => {
    const result = barsInView([
      bar({ name: 'Öl & Mat' }),
      bar({ name: 'Mellan', price_40cl: 45 }),
      bar({ name: 'Långt bort', price_40cl: 20, lng: 18.3 }),
      bar({ name: 'Billig', price_40cl: 30 }),
      bar({ name: 'Anchor' }),
    ], bounds, now)
    expect(result.map(b => b.name)).toEqual(['Billig', 'Mellan', 'Anchor', 'Öl & Mat'])
  })

  it('visar alla när vyn inte är känd än', () => {
    expect(barsInView([bar({ name: 'A' }), bar({ name: 'B', lng: 18.3 })], null, now)).toHaveLength(2)
  })
})

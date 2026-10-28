import { describe, expect, it } from 'vitest'
import type { Bar } from './supabase'
import {
  DEFAULT_FILTERS,
  applyFilters,
  filtersToQueryString,
  hasActiveFilters,
  mergeFiltersIntoSearch,
  parseFilters,
  serializeFilters,
} from './filters'

// Onsdag 28 oktober 2026 kl 18:00 (UTC+1)
const now = new Date('2026-10-28T18:00:00+01:00')

function bar(overrides: Partial<Bar>): Bar {
  return {
    id: overrides.name ?? 'x',
    google_place_id: null, osm_id: null, name: 'Bar', address: null, area: 'Södermalm', tags: null, blurb: null, lat: null, lng: null,
    opening_hours: { wednesday: '15:00–01:00' }, google_rating: null, photo_url: null, website: null,
    phone: null, price_40cl: 40, price_50cl: null, happy_hour_price: null, happy_hour_start: null,
    happy_hour_end: null, happy_hour_days: null, happy_hour_size: null, sunk_factor: 3, sunk_votes: 4,
    price_verified: true, price_thumbs_up: 0, price_thumbs_down: 0, price_confirmed_at: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

describe('URL-parametrar', () => {
  it('läser alla filter', () => {
    expect(parseFilters(new URLSearchParams('oppet=1&hh=1&omrade=Vasastan&maxpris=40&sunk=4&q=pub'))).toEqual({
      openNow: true, happyHour: true, area: 'Vasastan', maxPrice: 40, minSunk: 4, query: 'pub',
    })
  })

  it('ignorerar ogiltiga värden', () => {
    expect(parseFilters(new URLSearchParams('oppet=ja&maxpris=abc&sunk=9'))).toEqual(DEFAULT_FILTERS)
  })

  it('skriver bara aktiva filter och läser tillbaka samma sak', () => {
    const filters = { ...DEFAULT_FILTERS, openNow: true, area: 'Östermalm', maxPrice: 50 }
    expect(serializeFilters(filters).toString()).toBe('oppet=1&omrade=%C3%96stermalm&maxpris=50')
    expect(parseFilters(serializeFilters(filters))).toEqual(filters)
    expect(filtersToQueryString(DEFAULT_FILTERS)).toBe('')
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, query: 'x' })).toBe(true)
  })
})

describe('applyFilters', () => {
  const open = bar({ name: 'Öppen' })
  const closed = bar({ name: 'Stängd', opening_hours: { wednesday: 'stängt' } })
  const pricey = bar({ name: 'Dyr', price_40cl: 65, area: 'Vasastan' })
  const fiftyCl = bar({ name: 'Femtio', price_40cl: null, price_50cl: 45 }) // 36 kr per 40 cl
  const fancy = bar({ name: 'Fin', sunk_factor: 1.5 })
  const unvoted = bar({ name: 'Orörd', sunk_factor: 0, sunk_votes: 0 })
  const happy = bar({
    name: 'Happy', happy_hour_price: 30, happy_hour_start: '17:00', happy_hour_end: '19:00',
  })
  const all = [open, closed, pricey, fiftyCl, fancy, unvoted, happy]
  const names = (filters: Partial<typeof DEFAULT_FILTERS>) =>
    applyFilters(all, { ...DEFAULT_FILTERS, ...filters }, now).map(b => b.name)

  it('släpper igenom allt utan filter', () => {
    expect(names({})).toHaveLength(all.length)
  })

  it('filtrerar på öppet nu och happy hour', () => {
    expect(names({ openNow: true })).not.toContain('Stängd')
    expect(names({ happyHour: true })).toEqual(['Happy'])
  })

  it('filtrerar på maxpris per 40 cl', () => {
    expect(names({ maxPrice: 40 })).toEqual(['Öppen', 'Stängd', 'Femtio', 'Fin', 'Orörd', 'Happy'])
    expect(names({ maxPrice: 36 })).toEqual(['Femtio', 'Happy'])
  })

  it('filtrerar på minsta sunkfaktor och utesluter barer utan röster', () => {
    expect(names({ minSunk: 3 })).not.toContain('Fin')
    expect(names({ minSunk: 3 })).not.toContain('Orörd')
  })

  it('kombinerar filter', () => {
    expect(names({ openNow: true, area: 'Vasastan' })).toEqual(['Dyr'])
    expect(names({ openNow: true, maxPrice: 40, minSunk: 3, query: 'happ' })).toEqual(['Happy'])
  })
})

describe('mergeFiltersIntoSearch', () => {
  it('behåller parametrar som inte är filter, som kartans ?bar=', () => {
    const qs = mergeFiltersIntoSearch('?bar=abc&oppet=1', { ...DEFAULT_FILTERS, maxPrice: 40 })
    const params = new URLSearchParams(qs)
    expect(params.get('bar')).toBe('abc')
    expect(params.get('maxpris')).toBe('40')
    expect(params.has('oppet')).toBe(false)
  })

  it('ger tom sträng när inget finns kvar', () => {
    expect(mergeFiltersIntoSearch('?oppet=1', DEFAULT_FILTERS)).toBe('')
  })
})

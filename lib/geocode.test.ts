import { describe, expect, it } from 'vitest'
import { formatOsmId, matchArea, parseNominatim, parsePhoton } from './geocode'

describe('matchArea', () => {
  it('matchar appens områden och alias', () => {
    expect(matchArea('Södermalm')).toBe('Södermalm')
    expect(matchArea(null, 'kungsholmen')).toBe('Kungsholmen')
    expect(matchArea('Norrmalm')).toBe('Norrmalm')
    expect(matchArea('City')).toBe('Norrmalm')
    expect(matchArea('Gamla stan')).toBeNull()
    expect(matchArea('Vasastaden')).toBe('Vasastan')
    expect(matchArea('Bromma')).toBeNull()
  })
})

describe('formatOsmId', () => {
  it('bygger osm-id', () => {
    expect(formatOsmId('N', 123)).toBe('node/123')
    expect(formatOsmId('way', 5)).toBe('way/5')
    expect(formatOsmId(undefined, 5)).toBeNull()
  })
})

describe('parsePhoton', () => {
  it('tolkar en bar med adress', () => {
    const json = {
      features: [{
        geometry: { coordinates: [18.0809, 59.3135] as [number, number] },
        properties: {
          osm_type: 'N', osm_id: 42, name: 'Kvarnen', street: 'Tjärhovsgatan',
          housenumber: '4', district: 'Södermalm', city: 'Stockholm',
        },
      }],
    }
    expect(parsePhoton(json)).toEqual([{
      label: 'Kvarnen, Tjärhovsgatan 4, Södermalm',
      name: 'Kvarnen',
      lat: 59.3135,
      lng: 18.0809,
      osmId: 'node/42',
      area: 'Södermalm',
    }])
  })

  it('tolkar en ren adress och hoppar över poster utan koordinater', () => {
    const json = {
      features: [
        { properties: { name: 'Utan punkt' } },
        {
          geometry: { coordinates: [18.03, 59.33] as [number, number] },
          properties: { osm_type: 'W', osm_id: 7, street: 'Fridhemsgatan', housenumber: '17', locality: 'Kungsholmen' },
        },
      ],
    }
    expect(parsePhoton(json)).toEqual([{
      label: 'Fridhemsgatan 17, Kungsholmen',
      name: null,
      lat: 59.33,
      lng: 18.03,
      osmId: 'way/7',
      area: 'Kungsholmen',
    }])
  })
})

describe('parseNominatim', () => {
  it('tolkar adressdetaljer', () => {
    expect(parseNominatim([{
      lat: '59.3420', lon: '18.0490', osm_type: 'node', osm_id: 9, name: 'Tennstopet',
      address: { road: 'Dalagatan', house_number: '50', suburb: 'Vasastaden' },
    }])).toEqual([{
      label: 'Tennstopet, Dalagatan 50, Vasastaden',
      name: 'Tennstopet',
      lat: 59.342,
      lng: 18.049,
      osmId: 'node/9',
      area: 'Vasastan',
    }])
  })
})

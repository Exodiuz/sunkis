import { describe, expect, it } from 'vitest'
import { boundingBox, findDuplicates, namesSimilar, normalizeName } from './duplicates'

describe('normalizeName', () => {
  it('tar bort versaler, accenter, skiljetecken och tomma ord', () => {
    expect(normalizeName('The Old Pub & Kök!')).toBe('old kok')
    expect(normalizeName("O'Learys")).toBe('o learys')
  })
})

describe('namesSimilar', () => {
  it('känner igen samma bar med olika stavning', () => {
    expect(namesSimilar('Kvarnen', 'Kvarnen Bar')).toBe(true)
    expect(namesSimilar('The International', 'International Bar')).toBe(true)
    expect(namesSimilar('Pub Anchor', 'Anchor')).toBe(true)
  })

  it('skiljer olika barer åt', () => {
    expect(namesSimilar('Kvarnen', 'Akkurat')).toBe(false)
    expect(namesSimilar('Pub Anchor', 'Pub Kolingsborg')).toBe(false)
  })
})

describe('findDuplicates', () => {
  const existing = [
    { id: '1', name: 'Kvarnen', lat: 59.3135, lng: 18.0809 },
    { id: '2', name: 'Akkurat', lat: 59.3137, lng: 18.0811 },
    { id: '3', name: 'Kvarnen', lat: 59.3300, lng: 18.0600 },
    { id: '4', name: 'Hörnan', lat: null, lng: null },
  ]

  it('hittar liknande namn inom 50 m', () => {
    // ~20 m från Kvarnen
    expect(findDuplicates({ name: 'Kvarnen Bar', lat: 59.31367, lng: 18.0809 }, existing).map(b => b.id)).toEqual(['1'])
  })

  it('ignorerar samma namn långt bort och andra namn i närheten', () => {
    expect(findDuplicates({ name: 'Nya stället', lat: 59.3135, lng: 18.0809 }, existing)).toEqual([])
  })

  it('jämför bara namn när koordinater saknas', () => {
    expect(findDuplicates({ name: 'hörnan', lat: null, lng: null }, existing).map(b => b.id)).toEqual(['4'])
    expect(findDuplicates({ name: 'Kvarnen', lat: null, lng: null }, existing).map(b => b.id)).toEqual(['1', '3'])
  })
})

describe('boundingBox', () => {
  it('ger en ruta som täcker radien', () => {
    const box = boundingBox(59.3, 18.0, 60)
    expect(box.maxLat - 59.3).toBeCloseTo(60 / 111_320, 6)
    expect(box.maxLng - 18.0).toBeGreaterThan(box.maxLat - 59.3) // longitudgrader är kortare norrut
  })
})

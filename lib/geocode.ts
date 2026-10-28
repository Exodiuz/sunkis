// Geokodning — tolkar svar från Photon och Nominatim till ett gemensamt format (C1)
// Anropen görs server-side i /api/geocode, se docs/kartval.md

import { AREAS } from './filters'

export type GeocodeResult = {
  label: string        // "Folkungagatan 84, Södermalm"
  name: string | null  // platsens namn om det är en bar/restaurang
  lat: number
  lng: number
  osmId: string | null // "node/123", "way/456"
  area: string | null  // stadsdel om den matchar appens områden
}

// Stockholms innerstad med marginal: väst, syd, öst, norr
export const STOCKHOLM_BBOX = [17.75, 59.2, 18.35, 59.45] as const

const OSM_TYPES: Record<string, string> = { N: 'node', W: 'way', R: 'relation', node: 'node', way: 'way', relation: 'relation' }

// Stadsdelar i geodata som motsvarar appens områden
const AREA_ALIASES: Record<string, string> = {
  norrmalm: 'City',
  'gamla stan': 'City',
  city: 'City',
  vasastaden: 'Vasastan',
}

/**
 * Översätter stadsdel/kvarter från geodata till ett av appens områden
 */
export function matchArea(...candidates: (string | null | undefined)[]): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue
    const lower = candidate.trim().toLowerCase()
    const direct = AREAS.find(a => a.toLowerCase() === lower)
    if (direct) return direct
    if (AREA_ALIASES[lower]) return AREA_ALIASES[lower]
  }
  return null
}

export function formatOsmId(type: string | undefined, id: number | string | undefined): string | null {
  const t = type ? OSM_TYPES[type] : undefined
  return t && id !== undefined ? `${t}/${id}` : null
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    osm_type?: string
    osm_id?: number
    name?: string
    street?: string
    housenumber?: string
    district?: string
    locality?: string
    city?: string
  }
}

/**
 * Photon-svar (GeoJSON) → resultat. Poster utan koordinater hoppas över.
 */
export function parsePhoton(json: { features?: PhotonFeature[] }): GeocodeResult[] {
  return (json.features ?? []).flatMap(f => {
    const coords = f.geometry?.coordinates
    const p = f.properties ?? {}
    if (!coords) return []
    const street = [p.street, p.housenumber].filter(Boolean).join(' ')
    const area = matchArea(p.district, p.locality)
    const place = p.district ?? p.locality ?? p.city ?? null
    const name = p.name && p.name !== street ? p.name : null
    const label = [name, street || null, place].filter(Boolean).join(', ')
    if (!label) return []
    return [{
      label,
      name,
      lat: coords[1],
      lng: coords[0],
      osmId: formatOsmId(p.osm_type, p.osm_id),
      area,
    }]
  })
}

type NominatimPlace = {
  lat: string
  lon: string
  osm_type?: string
  osm_id?: number
  name?: string
  address?: {
    road?: string
    house_number?: string
    suburb?: string
    city_district?: string
    neighbourhood?: string
    quarter?: string
  }
}

/**
 * Nominatim-svar (format=jsonv2, addressdetails=1) → resultat
 */
export function parseNominatim(places: NominatimPlace[]): GeocodeResult[] {
  return places.map(p => {
    const a = p.address ?? {}
    const street = [a.road, a.house_number].filter(Boolean).join(' ')
    const place = a.suburb ?? a.city_district ?? a.quarter ?? null
    const name = p.name && p.name !== a.road ? p.name : null
    return {
      label: [name, street || null, place].filter(Boolean).join(', '),
      name,
      lat: Number(p.lat),
      lng: Number(p.lon),
      osmId: formatOsmId(p.osm_type, p.osm_id),
      area: matchArea(a.suburb, a.city_district, a.quarter, a.neighbourhood),
    }
  }).filter(r => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lng))
}

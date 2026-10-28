// Adressökning för /submit (C1)
// Photon för sök-medan-du-skriver; Nominatim som reserv bara vid uttrycklig
// sökning (?explicit=1), eftersom Nominatims policy förbjuder autocomplete.
// Svaren cachas i minnet och via Cache-Control. Se docs/kartval.md.

import { NextRequest, NextResponse } from 'next/server'
import { STOCKHOLM_BBOX, parseNominatim, parsePhoton, type GeocodeResult } from '@/lib/geocode'

const USER_AGENT = 'Sunkis/1.0 (+https://github.com/Exodiuz/sunkis)'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const MAX_CACHE_ENTRIES = 500

const cache = new Map<string, { at: number; results: GeocodeResult[] }>()

async function fromPhoton(q: string): Promise<GeocodeResult[]> {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '6')
  url.searchParams.set('bbox', STOCKHOLM_BBOX.join(','))
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(4000) })
  if (!res.ok) throw new Error(`Photon svarade ${res.status}`)
  return parsePhoton(await res.json())
}

async function fromNominatim(q: string): Promise<GeocodeResult[]> {
  const [west, south, east, north] = STOCKHOLM_BBOX
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '6')
  url.searchParams.set('countrycodes', 'se')
  url.searchParams.set('viewbox', `${west},${north},${east},${south}`)
  url.searchParams.set('bounded', '1')
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`Nominatim svarade ${res.status}`)
  return parseNominatim(await res.json())
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const explicit = req.nextUrl.searchParams.get('explicit') === '1'
  if (q.length < 3 || q.length > 120) {
    return NextResponse.json({ results: [] })
  }

  const key = q.toLowerCase()
  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json({ results: cached.results }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
  }

  let results: GeocodeResult[]
  try {
    results = await fromPhoton(q)
  } catch (photonError) {
    if (!explicit) {
      console.error('Photon misslyckades:', photonError)
      return NextResponse.json({ results: [], error: 'unavailable' }, { status: 503 })
    }
    try {
      results = await fromNominatim(q)
    } catch (nominatimError) {
      console.error('Geokodning misslyckades:', photonError, nominatimError)
      return NextResponse.json({ results: [], error: 'unavailable' }, { status: 503 })
    }
  }

  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string)
  cache.set(key, { at: Date.now(), results })
  return NextResponse.json({ results }, { headers: { 'Cache-Control': 'public, max-age=86400' } })
}

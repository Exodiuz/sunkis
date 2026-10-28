// Kartans data — vilka barer som visas, vilka kolumner som hämtas och hur
// varje bar blir en punkt med prisnål. Ren logik utan MapLibre, så den går att testa.

import type { Bar } from './supabase'
import { getComparablePrice, getCurrentPrice } from './happyHour'

// Bara det kartan, filtren och bar-kortet behöver — håller sidans payload liten
export const MAP_COLUMNS = [
  'id', 'name', 'area', 'address', 'lat', 'lng', 'opening_hours',
  'price_40cl', 'price_50cl',
  'happy_hour_price', 'happy_hour_start', 'happy_hour_end', 'happy_hour_days', 'happy_hour_size',
  'sunk_factor', 'sunk_votes', 'price_confirmed_at', 'price_thumbs_up', 'price_thumbs_down',
].join(', ')

export type MapBar = Pick<
  Bar,
  | 'id' | 'name' | 'area' | 'address' | 'lat' | 'lng' | 'opening_hours'
  | 'price_40cl' | 'price_50cl'
  | 'happy_hour_price' | 'happy_hour_start' | 'happy_hour_end' | 'happy_hour_days' | 'happy_hour_size'
  | 'sunk_factor' | 'sunk_votes' | 'price_confirmed_at' | 'price_thumbs_up' | 'price_thumbs_down'
>

// Granskade barer: verifierat pris, eller importerade från Google Places.
// Ogranskade inskick från /submit (varken eller) visas inte (D6).
export const MAP_VISIBILITY_FILTER = 'price_verified.eq.true,google_place_id.not.is.null'

export type PriceTier = 'cheap' | 'mid' | 'pricey' | 'none'

// Samma gränser som legenden: under 35 kr, 35–55 kr, över 55 kr per 40 cl
export function priceTier(comparable: number | null): PriceTier {
  if (comparable === null) return 'none'
  if (comparable < 35) return 'cheap'
  if (comparable <= 55) return 'mid'
  return 'pricey'
}

export type PinStyle = { tier: PriceTier; happyHour: boolean; label: string; selected: boolean }

// Nålens bild-id bär hela utseendet, så att bilden kan ritas när kartan ber om den
export function pinImageId({ tier, happyHour, label, selected }: PinStyle): string {
  return ['pin', tier, happyHour ? 'hh' : '-', selected ? 'sel' : '-', label].join('|')
}

export function parsePinImageId(id: string): PinStyle | null {
  const [prefix, tier, hh, sel, ...rest] = id.split('|')
  if (prefix !== 'pin' || !['cheap', 'mid', 'pricey', 'none'].includes(tier) || rest.length === 0) return null
  return { tier: tier as PriceTier, happyHour: hh === 'hh', selected: sel === 'sel', label: rest.join('|') }
}

export type BarFeatureProps = {
  id: string
  priced: boolean
  tier: PriceTier
  sort: number   // lägre vinner kollisioner — billigast syns först
  pin: string    // bild-id för nålen
  pinSelected: string
}

/**
 * GeoJSON för kartan. Barer utan koordinater hoppas över.
 */
export function toFeatureCollection(
  bars: MapBar[],
  now: Date,
): GeoJSON.FeatureCollection<GeoJSON.Point, BarFeatureProps> {
  const features: GeoJSON.Feature<GeoJSON.Point, BarFeatureProps>[] = []
  for (const bar of bars) {
    if (bar.lat === null || bar.lng === null) continue
    const { price, isHappyHour } = getCurrentPrice(bar, now)
    const comparable = getComparablePrice(bar, now)
    const tier = priceTier(comparable)
    const label = price === null ? '?' : `${price} kr`
    features.push({
      type: 'Feature',
      id: bar.id,
      geometry: { type: 'Point', coordinates: [bar.lng, bar.lat] },
      properties: {
        id: bar.id,
        priced: price !== null,
        tier,
        sort: comparable ?? 9999,
        pin: pinImageId({ tier, happyHour: isHappyHour, label, selected: false }),
        pinSelected: pinImageId({ tier, happyHour: isHappyHour, label, selected: true }),
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

export type Bounds = { west: number; south: number; east: number; north: number }

/**
 * Barer inom kartvyn: med pris först (billigast överst), sedan resten i bokstavsordning
 */
export function barsInView<T extends MapBar>(bars: T[], bounds: Bounds | null, now: Date): T[] {
  const inside = bounds
    ? bars.filter(bar =>
        bar.lat !== null && bar.lng !== null &&
        bar.lat >= bounds.south && bar.lat <= bounds.north &&
        bar.lng >= bounds.west && bar.lng <= bounds.east)
    : bars
  const priced = new Map(inside.map(bar => [bar.id, getComparablePrice(bar, now)]))
  return [...inside].sort((a, b) => {
    const pa = priced.get(a.id) ?? null
    const pb = priced.get(b.id) ?? null
    if (pa !== null && pb !== null && pa !== pb) return pa - pb
    if (pa !== null && pb === null) return -1
    if (pa === null && pb !== null) return 1
    return a.name.localeCompare(b.name, 'sv')
  })
}

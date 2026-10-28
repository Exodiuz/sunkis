// Filter för listan och kartan — samma URL-parametrar på båda sidorna (F2, K1)
// ?oppet=1&hh=1&omrade=Södermalm&maxpris=40&sunk=3&q=pub

import type { Bar } from './supabase'
import { getComparablePrice, isHappyHourActive } from './happyHour'
import { getOpenStatus } from './openingHours'

export type BarFilters = {
  openNow: boolean
  happyHour: boolean
  area: string | null
  maxPrice: number | null // per 40 cl
  minSunk: number | null  // 1–5
  query: string
}

export const DEFAULT_FILTERS: BarFilters = {
  openNow: false,
  happyHour: false,
  area: null,
  maxPrice: null,
  minSunk: null,
  query: '',
}

export const AREAS = ['Södermalm', 'Kungsholmen', 'Vasastan', 'Östermalm', 'City'] as const
export const MAX_PRICE_OPTIONS = [30, 40, 50, 60] as const
export const MIN_SUNK_OPTIONS = [3, 4, 5] as const

const PARAM = {
  openNow: 'oppet',
  happyHour: 'hh',
  area: 'omrade',
  maxPrice: 'maxpris',
  minSunk: 'sunk',
  query: 'q',
} as const

function toNumber(value: string | null, min: number, max: number): number | null {
  if (!value) return null
  const n = Number(value)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

/**
 * Läser filter från URL-parametrar. Ogiltiga värden ignoreras.
 */
export function parseFilters(params: URLSearchParams): BarFilters {
  return {
    openNow: params.get(PARAM.openNow) === '1',
    happyHour: params.get(PARAM.happyHour) === '1',
    area: params.get(PARAM.area)?.trim() || null,
    maxPrice: toNumber(params.get(PARAM.maxPrice), 1, 999),
    minSunk: toNumber(params.get(PARAM.minSunk), 1, 5),
    query: params.get(PARAM.query)?.trim() ?? '',
  }
}

/**
 * Skriver filter som URL-parametrar. Standardvärden utelämnas.
 */
export function serializeFilters(filters: BarFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.openNow) params.set(PARAM.openNow, '1')
  if (filters.happyHour) params.set(PARAM.happyHour, '1')
  if (filters.area) params.set(PARAM.area, filters.area)
  if (filters.maxPrice !== null) params.set(PARAM.maxPrice, String(filters.maxPrice))
  if (filters.minSunk !== null) params.set(PARAM.minSunk, String(filters.minSunk))
  if (filters.query.trim()) params.set(PARAM.query, filters.query.trim())
  return params
}

/**
 * "?oppet=1&hh=1" eller tom sträng — för länkar mellan lista och karta
 */
export function filtersToQueryString(filters: BarFilters): string {
  const qs = serializeFilters(filters).toString()
  return qs ? `?${qs}` : ''
}

export function hasActiveFilters(filters: BarFilters): boolean {
  return serializeFilters(filters).toString() !== ''
}

/**
 * Filtrerar barer — alla aktiva filter måste stämma (OCH)
 */
export function applyFilters<T extends Bar>(bars: T[], filters: BarFilters, now: Date): T[] {
  const q = filters.query.trim().toLowerCase()
  return bars.filter(bar => {
    if (filters.openNow && !getOpenStatus(bar, now).isOpen) return false
    if (filters.happyHour && !isHappyHourActive(bar, now)) return false
    if (filters.area && bar.area !== filters.area) return false
    if (filters.maxPrice !== null) {
      const price = getComparablePrice(bar, now)
      if (price === null || price > filters.maxPrice) return false
    }
    if (filters.minSunk !== null && !(bar.sunk_votes > 0 && bar.sunk_factor >= filters.minSunk)) return false
    if (q && !bar.name.toLowerCase().includes(q) && !(bar.area ?? '').toLowerCase().includes(q)) return false
    return true
  })
}

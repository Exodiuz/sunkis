// Logik för att avgöra om happy hour är aktiv just nu och vilket pris som gäller
// Använder svensk tidszon (Europe/Stockholm)

import type { Bar } from './supabase'
import { DAYNAMES, getStockholmClock, parseClock } from './time'

// Storleken alla priser jämförs mot
const COMPARABLE_CL = 40

type PricedBar = Pick<
  Bar,
  'price_40cl' | 'price_50cl' | 'happy_hour_price' | 'happy_hour_start' | 'happy_hour_end' | 'happy_hour_days'
> & { happy_hour_size?: string | null }

/**
 * Returnerar om en bar har aktiv happy hour vid tidpunkten `now`
 * Tar hänsyn till svensk tidszon och happy hour som går över midnatt
 */
export function isHappyHourActive(bar: PricedBar, now: Date = new Date()): boolean {
  if (!bar.happy_hour_start || !bar.happy_hour_end || !bar.happy_hour_price) {
    return false
  }

  const start = parseClock(bar.happy_hour_start)
  const end = parseClock(bar.happy_hour_end)
  if (start === null || end === null || start === end) return false

  const { day, minutes } = getStockholmClock(now)
  const appliesOn = (dayIndex: number) =>
    !bar.happy_hour_days || bar.happy_hour_days.length === 0 ||
    bar.happy_hour_days.includes(DAYNAMES[(dayIndex + 7) % 7])

  if (start < end) {
    return appliesOn(day) && minutes >= start && minutes < end
  }
  // Över midnatt, t.ex. 22:00–01:00: kvällen räknas till dagen den började
  if (minutes >= start) return appliesOn(day)
  if (minutes < end) return appliesOn(day - 1)
  return false
}

/**
 * Tolkar storlek som "40cl" eller "50 cl" till centiliter
 */
export function parseSize(size: string | null | undefined): number | null {
  const match = size?.match(/(\d+)\s*cl/i)
  return match ? Number(match[1]) : null
}

/**
 * "50cl" → "50 cl"
 */
export function formatSize(size: string): string {
  const cl = parseSize(size)
  return cl ? `${cl} cl` : size
}

/**
 * Räknar om ett pris till 40 cl, t.ex. 50 cl × 0,8
 */
export function toComparable(price: number, size: string): number {
  const cl = parseSize(size) ?? COMPARABLE_CL
  return Math.round((price * COMPARABLE_CL / cl) * 100) / 100
}

/**
 * Returnerar aktuellt pris för en bar (happy hour-pris om aktivt, annars ordinarie)
 * Har baren både 40 och 50 cl väljs den som är billigast räknat per 40 cl
 */
export function getCurrentPrice(
  bar: PricedBar,
  now: Date = new Date(),
): { price: number | null; size: string; isHappyHour: boolean } {
  if (isHappyHourActive(bar, now) && bar.happy_hour_price) {
    return { price: bar.happy_hour_price, size: bar.happy_hour_size || '40cl', isHappyHour: true }
  }

  const options = [
    bar.price_40cl ? { price: bar.price_40cl, size: '40cl' } : null,
    bar.price_50cl ? { price: bar.price_50cl, size: '50cl' } : null,
  ].filter((o): o is { price: number; size: string } => o !== null)

  if (options.length === 0) return { price: null, size: '', isHappyHour: false }

  const best = options.reduce((a, b) => (toComparable(b.price, b.size) < toComparable(a.price, a.size) ? b : a))
  return { ...best, isHappyHour: false }
}

/**
 * Aktuellt pris omräknat till 40 cl — används för sortering
 */
export function getComparablePrice(bar: PricedBar, now: Date = new Date()): number | null {
  const { price, size } = getCurrentPrice(bar, now)
  return price === null ? null : toComparable(price, size)
}

/**
 * Formaterar happy hour-tider för visning, t.ex. "15:00–18:00"
 */
export function formatHappyHourTime(bar: Pick<Bar, 'happy_hour_start' | 'happy_hour_end'>): string | null {
  if (!bar.happy_hour_start || !bar.happy_hour_end) return null
  return `${bar.happy_hour_start.slice(0,5)}–${bar.happy_hour_end.slice(0,5)}`
}

/**
 * Översätter engelska dagnamn till svenska förkortningar
 */
export function formatHappyHourDays(days: string[] | null): string {
  if (!days || days.length === 0) return 'alla dagar'
  const sv: Record<string, string> = {
    monday: 'mån', tuesday: 'tis', wednesday: 'ons',
    thursday: 'tor', friday: 'fre', saturday: 'lör', sunday: 'sön'
  }
  return days.map(d => sv[d] || d).join(', ')
}

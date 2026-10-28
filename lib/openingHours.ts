// Öppettider — avgör om en bar är öppen just nu
// Tolkar strängar som "15:00–01:00" mot svensk tid och hanterar pass efter midnatt

import type { Bar } from './supabase'
import { DAYNAMES, type DayName, formatClock, getStockholmClock, parseClock } from './time'

export type OpenStatus = {
  isOpen: boolean
  closesAt?: string   // "01:00" — när baren stänger om den är öppen
  opensAt?: string    // "15:00" — nästa öppning om den är stängd
  opensDay?: DayName  // satt om nästa öppning inte är i dag
  unknown?: boolean   // öppettider saknas helt
}

type Range = { start: number; end: number } // minuter från dagens midnatt, end kan vara > 1440

/**
 * Tolkar en dags öppettider till tidsintervall.
 * "15:00–01:00" → [{ start: 900, end: 1500 }], "stängt" → []
 * Flera pass separeras med komma: "11:00–14:00, 17:00–23:00"
 */
export function parseDayHours(value: string | null | undefined): Range[] {
  if (!value) return []
  const text = value.trim().toLowerCase()
  if (!text || text === 'stängt' || text === 'closed') return []

  const ranges: Range[] = []
  for (const part of text.split(',')) {
    const [from, to, ...rest] = part.split(/\s*[–—-]\s*/)
    if (!from || !to || rest.length > 0) continue
    const start = parseClock(from)
    let end = parseClock(to)
    if (start === null || end === null) continue
    // Stängning efter midnatt, t.ex. 15:00–01:00
    if (end <= start) end += 1440
    ranges.push({ start, end })
  }
  return ranges
}

/**
 * Returnerar om baren är öppen vid tidpunkten `now` (svensk tid).
 * Ett pass från gårdagen räknas om det fortfarande pågår efter midnatt.
 * Saknas en dag i öppettiderna räknas baren som stängd den dagen.
 */
export function getOpenStatus(
  bar: Pick<Bar, 'opening_hours'>,
  now: Date = new Date(),
): OpenStatus {
  const hours = bar.opening_hours
  if (!hours || Object.keys(hours).length === 0) {
    return { isOpen: false, unknown: true }
  }

  const { day, minutes } = getStockholmClock(now)
  const rangesFor = (offset: number) => parseDayHours(hours[DAYNAMES[(day + offset + 7) % 7]])

  // Gårdagens pass som sträcker sig över midnatt
  for (const r of rangesFor(-1)) {
    if (r.end > 1440 && minutes < r.end - 1440) {
      return { isOpen: true, closesAt: formatClock(r.end) }
    }
  }

  // Dagens pass
  for (const r of rangesFor(0)) {
    if (minutes >= r.start && minutes < r.end) {
      return { isOpen: true, closesAt: formatClock(r.end) }
    }
  }

  // Stängt — leta upp nästa öppning, i dag eller kommande dagar
  const laterToday = rangesFor(0).filter(r => r.start > minutes).sort((a, b) => a.start - b.start)[0]
  if (laterToday) return { isOpen: false, opensAt: formatClock(laterToday.start) }

  for (let offset = 1; offset <= 7; offset++) {
    const first = rangesFor(offset).sort((a, b) => a.start - b.start)[0]
    if (first) {
      return {
        isOpen: false,
        opensAt: formatClock(first.start),
        opensDay: DAYNAMES[(day + offset) % 7],
      }
    }
  }

  return { isOpen: false }
}

const DAY_SHORT_SV: Record<DayName, string> = {
  monday: 'mån', tuesday: 'tis', wednesday: 'ons', thursday: 'tor',
  friday: 'fre', saturday: 'lör', sunday: 'sön',
}

/**
 * Kort text för listan: "Öppet till 01:00" / "Öppnar 15:00" / "Öppnar fre 15:00"
 */
export function formatOpenStatus(status: OpenStatus): string | null {
  if (status.unknown) return null
  if (status.isOpen) return status.closesAt ? `Öppet till ${status.closesAt}` : 'Öppet'
  if (status.opensAt) {
    return status.opensDay
      ? `Öppnar ${DAY_SHORT_SV[status.opensDay]} ${status.opensAt}`
      : `Öppnar ${status.opensAt}`
  }
  return 'Stängt'
}

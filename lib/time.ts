// Tidshjälpare — all tidslogik räknar mot svensk tid (Europe/Stockholm)
// oavsett vilken tidszon servern eller webbläsaren kör i

// Dagnamn på engelska som matchar databasens format (index = Date.getDay())
export const DAYNAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const
export type DayName = (typeof DAYNAMES)[number]

const stockholmFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Stockholm',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

/**
 * Returnerar veckodag (0 = söndag) och minuter efter midnatt i Stockholm
 */
export function getStockholmClock(now: Date): { day: number; minutes: number } {
  const parts = stockholmFormat.formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  const hour = Number(get('hour')) % 24
  const minute = Number(get('minute'))
  return { day: WEEKDAY_INDEX[get('weekday')], minutes: hour * 60 + minute }
}

/**
 * Tolkar "15:00", "15:00:00" eller "15.00" till minuter efter midnatt
 */
export function parseClock(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?$/)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 24 || m > 59 || (h === 24 && m > 0)) return null
  return h * 60 + m
}

/**
 * Formaterar minuter efter midnatt som "HH:MM" (24:00 visas som 00:00)
 */
export function formatClock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

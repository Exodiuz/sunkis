// Logik för att avgöra om happy hour är aktiv just nu
// Använder svensk tidszon (Europe/Stockholm)

import type { Bar } from './supabase'

// Dagnamn på engelska som matchar databasens format
const DAYNAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

/**
 * Returnerar om en bar har aktiv happy hour just nu
 * Tar hänsyn till svensk tidszon
 */
export function isHappyHourActive(bar: Bar): boolean {
  if (!bar.happy_hour_start || !bar.happy_hour_end || !bar.happy_hour_price) {
    return false
  }

  // Hämta aktuell tid i Stockholm
  const now = new Date()
  const stockholmTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }))

  // Kolla om dagens dag matchar happy hour-dagarna
  const todayName = DAYNAMES[stockholmTime.getDay()]
  if (bar.happy_hour_days && bar.happy_hour_days.length > 0) {
    if (!bar.happy_hour_days.includes(todayName)) {
      return false
    }
  }

  // Jämför aktuell tid med start och slut
  const currentMinutes = stockholmTime.getHours() * 60 + stockholmTime.getMinutes()
  const [startH, startM] = bar.happy_hour_start.split(':').map(Number)
  const [endH, endM] = bar.happy_hour_end.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Returnerar aktuellt pris för en bar (happy hour-pris om aktivt, annars ordinarie)
 */
export function getCurrentPrice(bar: Bar): { price: number | null; size: string; isHappyHour: boolean } {
  const hhActive = isHappyHourActive(bar)

  if (hhActive && bar.happy_hour_price) {
    // Happy hour-pris gäller — vi vet inte storleken med säkerhet, visa 40cl som default
    return { price: bar.happy_hour_price, size: '40cl', isHappyHour: true }
  }

  // Visa 40cl-priset i första hand, annars 50cl
  if (bar.price_40cl) {
    return { price: bar.price_40cl, size: '40cl', isHappyHour: false }
  }
  if (bar.price_50cl) {
    return { price: bar.price_50cl, size: '50cl', isHappyHour: false }
  }

  return { price: null, size: '', isHappyHour: false }
}

/**
 * Formaterar happy hour-tider för visning, t.ex. "15:00–18:00"
 */
export function formatHappyHourTime(bar: Bar): string | null {
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

// Färskhet — hur länge sedan priset bekräftades (D3)
// Bekräftelse = admin-verifiering eller tumme upp

import type { Bar } from './supabase'

export const STALE_AFTER_DAYS = 90

const DAY_MS = 24 * 60 * 60 * 1000

export type Freshness = {
  daysAgo: number | null // null = aldrig bekräftat
  stale: boolean         // äldre än 90 dagar eller aldrig bekräftat
  label: string          // "Bekräftat för 3 dagar sedan · 12 röster"
}

function formatDaysAgo(days: number): string {
  if (days <= 0) return 'Bekräftat i dag'
  if (days === 1) return 'Bekräftat i går'
  return `Bekräftat för ${days} dagar sedan`
}

export function getFreshness(
  bar: Pick<Bar, 'price_confirmed_at' | 'price_thumbs_up'>,
  now: Date = new Date(),
): Freshness {
  const votes = bar.price_thumbs_up ?? 0
  const votesText = votes > 0 ? ` · ${votes} ${votes === 1 ? 'röst' : 'röster'}` : ''

  if (!bar.price_confirmed_at) {
    return { daysAgo: null, stale: true, label: `Inte bekräftat${votesText}` }
  }

  const confirmed = new Date(bar.price_confirmed_at).getTime()
  const daysAgo = Math.max(0, Math.floor((now.getTime() - confirmed) / DAY_MS))
  return {
    daysAgo,
    stale: daysAgo > STALE_AFTER_DAYS,
    label: `${formatDaysAgo(daysAgo)}${votesText}`,
  }
}

// MapBarList — barerna i kartvyn som lista, billigast först
// Tillgängligt alternativ till kartan (tangentbord och skärmläsare) och
// snabbaste vägen till "var är det billigast just här?".

'use client'

import type { MapBar } from '@/lib/mapBars'
import { priceTier } from '@/lib/mapBars'
import { getComparablePrice, getCurrentPrice } from '@/lib/happyHour'
import { formatDistance } from '@/lib/geo'
import { TIER_COLORS } from '@/lib/mapPins'
import { Zap } from 'lucide-react'

// Fler rader än så gör listan seg på mobil — då ber vi om inzoomning
export const MAX_LIST_ROWS = 60

type Props = {
  bars: MapBar[]           // redan sorterade
  now: Date
  selectedId: string | null
  distances: Map<string, number | null>
  onPick: (id: string) => void
}

export default function MapBarList({ bars, now, selectedId, distances, onPick }: Props) {
  const rows = bars.slice(0, MAX_LIST_ROWS)
  const hidden = bars.length - rows.length

  if (bars.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted text-center">Inga barer här. Zooma ut eller ändra filtren.</p>
  }

  return (
    <>
      <ul className="divide-y divide-line">
        {rows.map(bar => {
          const { price, isHappyHour } = getCurrentPrice(bar, now)
          const tier = priceTier(getComparablePrice(bar, now))
          const distance = distances.get(bar.id) ?? null
          const selected = bar.id === selectedId
          return (
            <li key={bar.id}>
              <button
                type="button"
                onClick={() => onPick(bar.id)}
                aria-current={selected ? 'true' : undefined}
                className={`w-full flex items-center gap-3 px-4 min-h-[56px] py-2 text-left transition-colors ${
                  selected ? 'bg-ink/70' : 'hover:bg-ink/40'
                }`}
              >
                <span
                  className={`flex-shrink-0 inline-flex items-center justify-center gap-0.5 min-w-[64px] h-7 px-2 rounded-full font-mono text-sm font-bold ${
                    tier === 'none' ? 'border border-dashed border-muted/60 text-muted' : 'border-2 border-ink text-ink'
                  } ${isHappyHour ? 'ring-2 ring-brand' : ''}`}
                  style={tier === 'none' ? undefined : { background: TIER_COLORS[tier] }}
                >
                  {isHappyHour && <Zap aria-hidden="true" className="w-3.5 h-3.5" fill="currentColor" />}
                  {price !== null ? `${price} kr` : '–'}
                  {isHappyHour && <span className="sr-only"> happy hour</span>}
                  {price === null && <span className="sr-only">pris saknas</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-cream truncate">{bar.name}</span>
                  <span className="block text-sm text-muted truncate">
                    {[bar.area, distance !== null ? formatDistance(distance) : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {hidden > 0 && (
        <p className="px-4 py-3 text-sm text-muted text-center">+ {hidden} till. Zooma in för att se dem.</p>
      )}
    </>
  )
}

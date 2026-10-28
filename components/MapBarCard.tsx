// MapBarCard — kortet för vald bar på kartan
// Pris, öppettider och avstånd i en blick, plus vägbeskrivning och länk till baren.
// Saknar baren pris kan man föreslå ett direkt härifrån (D2).

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MapPin, Navigation, TriangleAlert, X } from 'lucide-react'
import type { MapBar } from '@/lib/mapBars'
import { getCurrentPrice, formatHappyHourTime, formatSize } from '@/lib/happyHour'
import { directionsUrl, preferredMapsApp, type MapsApp } from '@/lib/directions'
import { formatDistance } from '@/lib/geo'
import HappyHourBadge from './HappyHourBadge'
import OpenStatus from './OpenStatus'
import PriceFreshness from './PriceFreshness'
import SunkFactor from './SunkFactor'
import SuggestPrice from './SuggestPrice'

type Props = {
  bar: MapBar
  now: Date
  distance: number | null
  onClose: () => void
}

export default function MapBarCard({ bar, now, distance, onClose }: Props) {
  const { price, size, isHappyHour } = getCurrentPrice(bar, now)
  const [app, setApp] = useState<MapsApp>('google')

  // Plattformen kan bara avgöras i webbläsaren
  useEffect(() => setApp(preferredMapsApp(navigator.userAgent)), [])

  // Esc stänger kortet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const hhTime = formatHappyHourTime(bar)

  return (
    <section
      aria-label={bar.name}
      className="pointer-events-auto bg-surface/95 backdrop-blur-sm border border-line rounded-2xl shadow-2xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/bar/${bar.id}`}
            className="block font-display text-lg font-medium text-cream hover:text-brand-light truncate"
          >
            {bar.name}
          </Link>
          <div className="flex items-center gap-x-2 gap-y-1 flex-wrap text-sm text-muted mt-0.5">
            {bar.area && <span>{bar.area}</span>}
            {distance !== null && (
              <span className="inline-flex items-center gap-1">
                {bar.area && <span aria-hidden="true">·</span>}
                <MapPin aria-hidden="true" className="w-4 h-4" />
                {formatDistance(distance)}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Stäng"
          className="flex-shrink-0 -mr-2 -mt-2 w-11 h-11 inline-flex items-center justify-center rounded-full text-muted hover:text-cream hover:bg-ink/60"
        >
          <X aria-hidden="true" className="w-5 h-5" />
        </button>
      </div>

      {price !== null ? (
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="whitespace-nowrap">
              <span className={`font-mono text-3xl font-bold ${isHappyHour ? 'text-success' : 'text-brand-light'}`}>
                {price} kr
              </span>
              <span className="text-sm text-muted"> · {formatSize(size)}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {isHappyHour && <HappyHourBadge compact />}
              {!isHappyHour && bar.happy_hour_price && hhTime && (
                <span className="text-sm text-muted">
                  HH {hhTime}: {bar.happy_hour_price} kr
                </span>
              )}
              {bar.price_thumbs_down >= 5 && (
                <span className="text-sm text-warning">
                  <TriangleAlert aria-hidden="true" className="inline w-4 h-4 -mt-0.5 mr-1" />
                  Osäkert
                </span>
              )}
            </div>
          </div>
          <SunkFactor score={bar.sunk_factor} size="sm" />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted italic">Pris saknas</p>
          <SuggestPrice key={bar.id} barId={bar.id} label="Vet du vad en stor stark kostar här?" />
        </div>
      )}

      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
        <OpenStatus bar={bar} now={now} />
        {price !== null && <PriceFreshness bar={bar} now={now} />}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {bar.lat !== null && bar.lng !== null && (
          <a
            href={directionsUrl(bar.lat, bar.lng, app)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-full bg-brand text-ink text-sm font-medium hover:bg-brand-light transition-colors"
          >
            <Navigation aria-hidden="true" className="w-4 h-4" />
            Vägbeskrivning
            <span className="sr-only"> (öppnas i {app === 'apple' ? 'Apple Kartor' : 'Google Maps'})</span>
          </a>
        )}
        <Link
          href={`/bar/${bar.id}`}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-full border border-line text-sm font-medium text-cream hover:border-brand"
        >
          Visa baren
          <ArrowRight aria-hidden="true" className="w-4 h-4" />
        </Link>
      </div>
    </section>
  )
}

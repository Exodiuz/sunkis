// MapClient — kartsidans klientdel
// Läser samma URL-filter som listan (K1) och skickar filtrerade barer till kartan

'use client'

import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Bar } from '@/lib/supabase'
import { applyFilters, hasActiveFilters, type BarFilters } from '@/lib/filters'
import { SUNK_LEVELS } from '@/lib/sunk'
import { useNow } from '@/lib/useNow'
import { useUrlFilters } from '@/lib/useUrlFilters'
import { useUserLocation } from '@/lib/useUserLocation'

// Ladda kartan dynamiskt (inget SSR — MapLibre kräver window-objekt)
const BarMap = dynamic(() => import('@/components/BarMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface rounded-xl">
      <div className="text-muted text-sm">Laddar karta...</div>
    </div>
  ),
})

type Props = {
  bars: Bar[]
  renderedAt: number
}

// Kort beskrivning av aktiva filter: "Öppet nu · Max 40 kr"
function describeFilters(filters: BarFilters): string {
  return [
    filters.openNow && 'Öppet nu',
    filters.happyHour && 'Happy hour nu',
    filters.area,
    filters.maxPrice !== null && `Max ${filters.maxPrice} kr`,
    filters.minSunk !== null && SUNK_LEVELS[filters.minSunk - 1].label + (filters.minSunk < 5 ? '+' : ''),
    filters.query && `”${filters.query}”`,
  ].filter(Boolean).join(' · ')
}

export default function MapClient({ bars, renderedAt }: Props) {
  const now = useNow(renderedAt)
  const { filters, resetFilters } = useUrlFilters()
  const visible = useMemo(() => applyFilters(bars, filters, now), [bars, filters, now])
  const active = hasActiveFilters(filters)

  // Egen position (K3) — frågar först när användaren trycker på knappen
  const location = useUserLocation()
  const [centerRequest, setCenterRequest] = useState(0)
  const [wantsCenter, setWantsCenter] = useState(false)

  function centerOnMe() {
    if (location.position) setCenterRequest(n => n + 1)
    else {
      setWantsCenter(true)
      location.request()
    }
  }

  // Centrera så fort positionen kommer om användaren bad om det
  useEffect(() => {
    if (wantsCenter && location.position) {
      setCenterRequest(n => n + 1)
      setWantsCenter(false)
    }
  }, [wantsCenter, location.position])

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] bg-ink">
      {/* Header */}
      <header className="flex-shrink-0 bg-ink/95 backdrop-blur-sm border-b border-surface">
        <div className="max-w-screen-xl mx-auto px-4 py-1 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="inline-flex items-center min-h-[44px] text-xl font-display font-bold">
              <span className="text-brand">sunk</span>
              <span className="text-teal">is</span>
            </Link>
            <span className="text-muted text-sm hidden sm:block">
              {visible.length} barer på kartan
            </span>
          </div>
        </div>

        {/* Aktiva filter från listan */}
        {active && (
          <div className="max-w-screen-xl mx-auto px-4 pb-1 flex items-center justify-between gap-2 text-sm">
            <p className="text-muted truncate">
              <span className="text-cream">{visible.length} av {bars.length}</span> · {describeFilters(filters)}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="flex-shrink-0 min-h-[44px] px-2 -mr-2 text-brand-light hover:text-teal"
            >
              Rensa filter <X aria-hidden="true" className="inline w-4 h-4 -mt-0.5" />
            </button>
          </div>
        )}
      </header>

      {/* Karta — tar upp resten av skärmen */}
      <div className="flex-1 relative p-2">
        <BarMap bars={visible} userPosition={location.position} centerRequest={centerRequest} />

        {/* Centrera på mig — nere till höger, ovanför attributionen */}
        <div className="absolute right-4 bottom-12 z-10 flex flex-col items-end gap-2">
          {(location.status === 'denied' || location.status === 'unavailable') && (
            <p role="status" className="max-w-[220px] text-right text-sm bg-surface/95 border border-line rounded-lg px-3 py-2 text-muted">
              {location.status === 'denied' ? 'Platsåtkomst är avstängd.' : 'Kunde inte hitta din position.'}
            </p>
          )}
          <button
            type="button"
            onClick={centerOnMe}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-surface border border-line text-sm font-medium text-cream shadow-lg hover:border-brand"
          >
            <span aria-hidden="true" className="w-3 h-3 rounded-full bg-location ring-2 ring-white" />
            {location.status === 'locating' ? 'Hämtar position…' : 'Centrera på mig'}
          </button>
        </div>
      </div>
    </div>
  )
}

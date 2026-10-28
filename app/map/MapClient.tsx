// MapClient — kartsidans klientdel
// Läser samma URL-filter som listan (K1) och skickar filtrerade barer till kartan

'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Bar } from '@/lib/supabase'
import { applyFilters, filtersToQueryString, hasActiveFilters, type BarFilters } from '@/lib/filters'
import { SUNK_LEVELS } from '@/lib/sunk'
import { useNow } from '@/lib/useNow'
import { useUrlFilters } from '@/lib/useUrlFilters'
import { useUserLocation } from '@/lib/useUserLocation'

// Ladda kartan dynamiskt (inget SSR — MapLibre kräver window-objekt)
const BarMap = dynamic(() => import('@/components/BarMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#2c2c2a] rounded-xl">
      <div className="text-[#A3A199] text-sm">Laddar karta...</div>
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
    <div className="flex flex-col h-screen bg-[#1a1a18]">
      {/* Header */}
      <header className="flex-shrink-0 bg-[#1a1a18]/95 backdrop-blur-sm border-b border-[#2c2c2a]">
        <div className="max-w-screen-xl mx-auto px-4 py-1 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="inline-flex items-center min-h-[44px] text-xl font-medium">
              <span className="text-[#EF9F27]">sunk</span>
              <span className="text-[#F5C55B]">is</span>
            </Link>
            <span className="text-[#A3A199] text-sm hidden sm:block">
              {visible.length} barer på kartan
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm -mr-2">
            {/* Tillbaka till listan med samma filter */}
            <Link href={`/${filtersToQueryString(filters)}`} className="inline-flex items-center min-h-[44px] px-2 text-[#A3A199] hover:text-[#EF9F27] transition-colors">
              ☰ Lista
            </Link>
            <Link href="/submit" className="inline-flex items-center min-h-[44px] px-2 text-[#A3A199] hover:text-[#EF9F27] transition-colors">
              + Lägg till
            </Link>
          </div>
        </div>

        {/* Aktiva filter från listan */}
        {active && (
          <div className="max-w-screen-xl mx-auto px-4 pb-1 flex items-center justify-between gap-2 text-sm">
            <p className="text-[#A3A199] truncate">
              <span className="text-[#F1EFE8]">{visible.length} av {bars.length}</span> · {describeFilters(filters)}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="flex-shrink-0 min-h-[44px] px-2 -mr-2 text-[#EF9F27] hover:text-[#F5C55B]"
            >
              Rensa filter ×
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
            <p role="status" className="max-w-[220px] text-right text-sm bg-[#2c2c2a]/95 border border-[#3a3a38] rounded-lg px-3 py-2 text-[#A3A199]">
              {location.status === 'denied' ? 'Platsåtkomst är avstängd.' : 'Kunde inte hitta din position.'}
            </p>
          )}
          <button
            type="button"
            onClick={centerOnMe}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-[#2c2c2a] border border-[#3a3a38] text-sm font-medium text-[#F1EFE8] shadow-lg hover:border-[#BA7517]"
          >
            <span aria-hidden="true" className="w-3 h-3 rounded-full bg-[#3b82f6] ring-2 ring-white" />
            {location.status === 'locating' ? 'Hämtar position…' : 'Centrera på mig'}
          </button>
        </div>
      </div>
    </div>
  )
}

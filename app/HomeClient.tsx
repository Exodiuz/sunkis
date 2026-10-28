// HomeClient — klientkomponent för startsidan
// Hanterar filtrering, sökning och visning av rankinglistan

'use client'

import { Search, X, Beer, ArrowRight } from 'lucide-react'
import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import type { Bar } from '@/lib/supabase'
import { getComparablePrice } from '@/lib/happyHour'
import { distinctAreas } from '@/lib/areas'
import { applyFilters, hasActiveFilters } from '@/lib/filters'
import { useUrlFilters } from '@/lib/useUrlFilters'
import { useNow } from '@/lib/useNow'
import { distanceToBar } from '@/lib/geo'
import { useUserLocation } from '@/lib/useUserLocation'
import FilterPills from '@/components/FilterPills'
import BarCard from '@/components/BarCard'

type Sort = 'billigast' | 'närmast'

// "Nära mig" visar barer inom gångavstånd
const NEAR_ME_RADIUS_M = 1500

type Props = {
  bars: Bar[]
  missingPriceCount: number // barer utan pris, länkas till /saknar-pris
  renderedAt: number // serverns tidsstämpel, se useNow
}

export default function HomeClient({ bars, missingPriceCount, renderedAt }: Props) {
  // Aktuell tid i Stockholm — samma värde för filter och alla kort
  const now = useNow(renderedAt)
  // Kombinerbara filter och sökning, speglade i URL:en (F2)
  const { filters, setFilters, resetFilters } = useUrlFilters()
  const searchRef = useRef<HTMLInputElement>(null)
  // Områden från barerna i listan (F3)
  const areas = useMemo(() => distinctAreas(bars.map(b => b.area)), [bars])
  // Sortering och "Nära mig" — position hämtas först när användaren ber om det
  const [sort, setSort] = useState<Sort>('billigast')
  const [nearMe, setNearMe] = useState(false)
  const location = useUserLocation()
  const hasPosition = location.status === 'granted' && location.position !== null

  // Avstånd per bar, null om position eller koordinater saknas
  const distances = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const bar of bars) map.set(bar.id, distanceToBar(location.position, bar))
    return map
  }, [bars, location.position])

  function toggleNearMe() {
    if (!nearMe && !hasPosition) location.request()
    setNearMe(prev => !prev)
  }

  function chooseSort(next: Sort) {
    if (next === 'närmast' && !hasPosition) location.request()
    setSort(next)
  }

  // Positionen kan inte användas — falla tillbaka på områdesval
  const locationBlocked = location.status === 'denied' || location.status === 'unavailable'
  const nearMeActive = nearMe && !locationBlocked
  const sortByDistance = sort === 'närmast' && hasPosition

  // Filtrering och sortering — memoizeras för prestanda
  const filteredBars = useMemo(() => {
    // Bara barer med pris rankas (D2)
    let result = bars.filter(b => getComparablePrice(b, now) !== null)


    // Alla aktiva filter måste stämma — samma logik som kartan (lib/filters.ts)
    result = applyFilters(result, filters, now)

    // Nära mig — bara barer inom gångavstånd (väntar tills positionen finns)
    if (nearMeActive && hasPosition) {
      result = result.filter(b => {
        const d = distances.get(b.id)
        return d !== null && d !== undefined && d <= NEAR_ME_RADIUS_M
      })
    }

    // Sortera: närmast först (barer utan koordinater sist) eller pris per 40 cl
    if (sortByDistance) {
      const d = (bar: Bar) => distances.get(bar.id) ?? Infinity
      return result.sort((a, b) => d(a) - d(b))
    }
    return result.sort((a, b) => (getComparablePrice(a, now) ?? 0) - (getComparablePrice(b, now) ?? 0))
  }, [bars, filters, now, nearMeActive, hasPosition, sortByDistance, distances])

  return (
    <div className="min-h-screen bg-ink">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-ink/95 backdrop-blur-sm border-b border-surface">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            {/* Logga: "sunk" i rosa och "is" i turkos (V1) */}
            <Link href="/" className="inline-flex items-center min-h-[44px] text-2xl font-display font-bold tracking-tight">
              <span className="text-brand">sunk</span>
              <span className="text-teal">is</span>
            </Link>

          </div>
          <p className="text-muted text-sm">Billigaste ölet i Stockholm</p>
        </div>
      </header>

      {/* Sök och filter */}
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-2 space-y-3">
        {/* Sökruta */}
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            ref={searchRef}
            aria-label="Sök bar eller stadsdel"
            placeholder="Sök bar eller stadsdel..."
            value={filters.query}
            onChange={e => setFilters({ query: e.target.value })}
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-line rounded-xl text-cream placeholder-muted text-sm focus:border-brand transition-colors"
          />
        </div>

        {/* Filterpills */}
        <FilterPills
          filters={filters}
          areas={areas}
          onChange={setFilters}
          nearMe={nearMeActive}
          onToggleNearMe={locationBlocked ? undefined : toggleNearMe}
        />

        {/* Sortering */}
        <div className="flex items-center gap-2" role="group" aria-label="Sortering">
          <span className="text-sm text-muted">Sortera:</span>
          {(['billigast', 'närmast'] as const).map(option => (
            <button
              key={option}
              type="button"
              aria-pressed={sort === option}
              onClick={() => chooseSort(option)}
              disabled={option === 'närmast' && locationBlocked}
              className={`min-h-[44px] px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                sort === option ? 'text-cream bg-surface' : 'text-muted hover:text-cream'
              }`}
            >
              {option === 'billigast' ? 'Billigast' : 'Närmast'}
            </button>
          ))}
        </div>

        {/* Statusrader för positionen */}
        {location.status === 'locating' && (nearMe || sort === 'närmast') && (
          <p className="text-sm text-muted" role="status">Hämtar din position…</p>
        )}
        {locationBlocked && (
          <p className="text-sm text-muted" role="status">
            {location.status === 'denied'
              ? 'Platsåtkomst är avstängd – välj ett område ovan i stället.'
              : 'Kunde inte hitta din position – välj ett område ovan i stället.'}{' '}
            <button
              type="button"
              onClick={() => { setNearMe(true); location.request() }}
              className="min-h-[44px] px-1 text-brand-light underline underline-offset-2"
            >
              Försök igen
            </button>
          </p>
        )}
      </div>

      {/* Rankinglista */}
      <main className="max-w-2xl mx-auto px-4 pb-8">
        {/* Statistikrad */}
        <div className="flex items-center justify-between py-2 mb-3">
          <p className="text-sm text-muted">
            {filteredBars.length} {filteredBars.length === 1 ? 'bar' : 'barer'} hittades
          </p>
          {(hasActiveFilters(filters) || nearMeActive) && (
            <button
              onClick={() => { resetFilters(); setNearMe(false); searchRef.current?.focus() }}
              className="min-h-[44px] px-2 -mr-2 text-sm text-brand-light hover:text-teal"
            >
              Rensa filter <X aria-hidden="true" className="inline w-4 h-4 -mt-0.5" />
            </button>
          )}
        </div>

        {/* Inga resultat */}
        {filteredBars.length === 0 && (
          <div className="text-center py-16 text-muted">
            <Beer aria-hidden="true" className="w-10 h-10 mx-auto mb-3" />
            <p className="text-lg font-medium text-cream">Inga barer hittades</p>
            <p className="text-sm mt-1">Prova ett annat filter eller sök på nytt</p>
          </div>
        )}

        {/* Rankade barer — bara de som har pris */}
        <div className="space-y-2">
          {filteredBars.map((bar, i) => (
            <BarCard
              key={bar.id}
              bar={bar}
              rank={sortByDistance ? undefined : i + 1}
              now={now}
              distance={distances.get(bar.id) ?? null}
            />
          ))}
        </div>

        {/* Barer utan pris rankas inte — en rad som leder till listan där man kan fylla i */}
        {missingPriceCount > 0 && (
          <Link
            href="/saknar-pris"
            className="mt-4 flex items-center justify-between gap-3 min-h-[44px] px-4 py-3 rounded-xl border border-dashed border-line text-sm text-muted hover:border-brand hover:text-cream transition-colors"
          >
            <span>
              {missingPriceCount} {missingPriceCount === 1 ? 'bar saknar' : 'barer saknar'} pris – vet du vad det kostar?
            </span>
            <ArrowRight aria-hidden="true" className="w-4 h-4 flex-shrink-0 text-brand-light" />
          </Link>
        )}

        {/* Uppmaning att lägga till barer */}
        <div className="mt-8 p-4 bg-surface rounded-xl border border-line text-center">
          <p className="text-sm text-muted">
            Känner du till ett billigt hak?{' '}
            <Link href="/submit" className="text-brand-light underline underline-offset-2">
              Lägg till det <ArrowRight aria-hidden="true" className="inline w-4 h-4 -mt-0.5" />
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

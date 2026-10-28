// HomeClient — klientkomponent för startsidan
// Hanterar filtrering, sökning och visning av rankinglistan

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Bar } from '@/lib/supabase'
import { isHappyHourActive, getComparablePrice } from '@/lib/happyHour'
import { getOpenStatus } from '@/lib/openingHours'
import { useNow } from '@/lib/useNow'
import FilterPills, { type Filter } from '@/components/FilterPills'
import BarCard from '@/components/BarCard'

type Props = {
  bars: Bar[]
  missingPriceCount: number // barer utan pris, länkas till /saknar-pris
  renderedAt: number // serverns tidsstämpel, se useNow
}

export default function HomeClient({ bars, missingPriceCount, renderedAt }: Props) {
  // Aktuell tid i Stockholm — samma värde för filter och alla kort
  const now = useNow(renderedAt)
  // Aktivt filter
  const [activeFilter, setActiveFilter] = useState<Filter>('alla')
  // Söktext
  const [search, setSearch] = useState('')

  // Filtrering och sortering — memoizeras för prestanda
  const filteredBars = useMemo(() => {
    // Bara barer med pris rankas (D2)
    let result = bars.filter(b => getComparablePrice(b, now) !== null)

    // Filtrera på aktiv filter
    switch (activeFilter) {
      case 'öppet-nu':
        result = result.filter(b => getOpenStatus(b, now).isOpen)
        break
      case 'happy-hour-nu':
        result = result.filter(b => isHappyHourActive(b, now))
        break
      case 'Södermalm':
      case 'Kungsholmen':
      case 'Vasastan':
      case 'Östermalm':
      case 'City':
        result = result.filter(b => b.area === activeFilter)
        break
    }

    // Filtrera på söktext (namn eller stadsdel)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        b => b.name.toLowerCase().includes(q) || (b.area ?? '').toLowerCase().includes(q)
      )
    }

    // Sortera på pris per 40 cl, billigast först
    return result.sort((a, b) => (getComparablePrice(a, now) ?? 0) - (getComparablePrice(b, now) ?? 0))
  }, [bars, activeFilter, search, now])

  return (
    <div className="min-h-screen bg-[#1a1a18]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#1a1a18]/95 backdrop-blur-sm border-b border-[#2c2c2a]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            {/* Logga: "sunkis" med "is" i ljusare amber */}
            <Link href="/" className="text-2xl font-medium tracking-tight">
              <span className="text-[#EF9F27]">sunk</span>
              <span className="text-[#F5C55B]">is</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-3 text-sm">
              <Link href="/map" className="text-[#888780] hover:text-[#EF9F27] transition-colors">
                🗺️ Karta
              </Link>
              <Link href="/submit" className="text-[#888780] hover:text-[#EF9F27] transition-colors">
                + Lägg till
              </Link>
            </nav>
          </div>
          <p className="text-[#888780] text-sm">Billigaste ölet i Stockholm</p>
        </div>
      </header>

      {/* Sök och filter */}
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-2 space-y-3">
        {/* Sökruta */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888780]">🔍</span>
          <input
            type="text"
            placeholder="Sök bar eller stadsdel..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#2c2c2a] border border-[#3a3a38] rounded-xl text-[#F1EFE8] placeholder-[#888780] text-sm focus:outline-none focus:border-[#BA7517] transition-colors"
          />
        </div>

        {/* Filterpills */}
        <FilterPills active={activeFilter} onChange={setActiveFilter} />
      </div>

      {/* Rankinglista */}
      <main className="max-w-2xl mx-auto px-4 pb-8">
        {/* Statistikrad */}
        <div className="flex items-center justify-between py-2 mb-3">
          <p className="text-xs text-[#888780]">
            {filteredBars.length} {filteredBars.length === 1 ? 'bar' : 'barer'} hittades
          </p>
          {activeFilter !== 'alla' && (
            <button
              onClick={() => { setActiveFilter('alla'); setSearch('') }}
              className="text-xs text-[#BA7517] hover:text-[#EF9F27]"
            >
              Rensa filter ×
            </button>
          )}
        </div>

        {/* Inga resultat */}
        {filteredBars.length === 0 && (
          <div className="text-center py-16 text-[#888780]">
            <div className="text-4xl mb-3">🍺</div>
            <p className="text-lg font-medium text-[#F1EFE8]">Inga barer hittades</p>
            <p className="text-sm mt-1">Prova ett annat filter eller sök på nytt</p>
          </div>
        )}

        {/* Rankade barer — bara de som har pris */}
        <div className="space-y-2">
          {filteredBars.map((bar, i) => (
            <BarCard key={bar.id} bar={bar} rank={i + 1} now={now} />
          ))}
        </div>

        {/* Barer utan pris rankas inte — en rad som leder till listan där man kan fylla i */}
        {missingPriceCount > 0 && (
          <Link
            href="/saknar-pris"
            className="mt-4 flex items-center justify-between gap-3 min-h-[44px] px-4 py-3 rounded-xl border border-dashed border-[#3a3a38] text-sm text-[#888780] hover:border-[#BA7517] hover:text-[#F1EFE8] transition-colors"
          >
            <span>
              {missingPriceCount} {missingPriceCount === 1 ? 'bar saknar' : 'barer saknar'} pris – vet du vad det kostar?
            </span>
            <span aria-hidden="true" className="text-[#EF9F27]">→</span>
          </Link>
        )}

        {/* Uppmaning att lägga till barer */}
        <div className="mt-8 p-4 bg-[#2c2c2a] rounded-xl border border-[#3a3a38] text-center">
          <p className="text-sm text-[#888780]">
            Känner du till ett billigt hak?{' '}
            <Link href="/submit" className="text-[#EF9F27] hover:underline">
              Lägg till det →
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

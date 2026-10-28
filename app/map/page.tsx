// Kartsidan — visar alla barer med Leaflet.js
// Dynamisk import används för att undvika SSR-fel med Leaflet

import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Ladda kartan dynamiskt (inget SSR — Leaflet kräver window-objekt)
const BarMap = dynamic(() => import('@/components/BarMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#2c2c2a] rounded-xl">
      <div className="text-[#A3A199] text-sm">Laddar karta...</div>
    </div>
  ),
})

// Hämtar granskade barer med koordinater — ogranskade inskick visas inte (D6)
async function getBars() {
  const { data, error } = await supabase
    .from('bars')
    .select('*')
    .eq('price_verified', true)
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  if (error) {
    console.error('Fel vid hämtning av barer för karta:', error)
    return []
  }
  return data ?? []
}

export const revalidate = 300

export default async function MapPage() {
  const bars = await getBars()

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
              {bars.length} barer på kartan
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm -mr-2">
            <Link href="/" className="inline-flex items-center min-h-[44px] px-2 text-[#A3A199] hover:text-[#EF9F27] transition-colors">
              ☰ Lista
            </Link>
            <Link href="/submit" className="inline-flex items-center min-h-[44px] px-2 text-[#A3A199] hover:text-[#EF9F27] transition-colors">
              + Lägg till
            </Link>
          </div>
        </div>
      </header>

      {/* Karta — tar upp resten av skärmen */}
      <div className="flex-1 relative p-2">
        <BarMap bars={bars} />
      </div>
    </div>
  )
}

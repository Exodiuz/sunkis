// Barer som saknar pris — besökare kan föreslå vad ölen kostar
// Sorteras efter Google-betyg så att de mest besökta barerna kommer först

import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import SuggestPrice from '@/components/SuggestPrice'

export const metadata = {
  title: 'Barer som saknar pris — Sunkis',
}

export const revalidate = 300

async function getBarsWithoutPrice() {
  const { data, error } = await supabase
    .from('bars')
    .select('id, name, area, address, google_rating')
    .is('price_40cl', null)
    .is('price_50cl', null)
    .order('google_rating', { ascending: false, nullsFirst: false })
    .limit(200)

  if (error) {
    console.error('Fel vid hämtning av barer utan pris:', error)
    return []
  }
  return data ?? []
}

export default async function MissingPricesPage() {
  const bars = await getBarsWithoutPrice()

  return (
    <div className="min-h-screen bg-[#1a1a18]">
      {/* Header */}
      <header className="bg-[#1a1a18]/95 backdrop-blur-sm border-b border-[#2c2c2a]">
        <div className="max-w-2xl mx-auto px-4 py-1 flex items-center gap-3">
          <Link href="/" className="inline-flex items-center min-h-[44px] text-[#888780] hover:text-[#EF9F27] transition-colors">
            ← Tillbaka
          </Link>
          <span className="text-[#3a3a38]">/</span>
          <Link href="/" className="inline-flex items-center min-h-[44px] text-xl font-medium">
            <span className="text-[#EF9F27]">sunk</span>
            <span className="text-[#F5C55B]">is</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-medium text-[#F1EFE8] mb-1">Vet du vad det kostar?</h1>
        <p className="text-sm text-[#888780] mb-6">
          De här barerna saknar pris. Skicka in vad en öl kostar så granskar vi det och lägger upp baren i listan.
        </p>

        {bars.length === 0 ? (
          <p className="text-sm text-[#888780]">Alla barer har pris just nu. Tack!</p>
        ) : (
          <ul className="space-y-2">
            {bars.map(bar => (
              <li key={bar.id} className="bg-[#2c2c2a] rounded-xl border border-[#3a3a38] p-4 space-y-3">
                <div>
                  <Link href={`/bar/${bar.id}`} className="font-medium text-[#F1EFE8] hover:text-[#EF9F27] transition-colors">
                    {bar.name}
                  </Link>
                  <p className="text-sm text-[#888780]">
                    {[bar.area, bar.address].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <SuggestPrice barId={bar.id} label="Pris för en öl" />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

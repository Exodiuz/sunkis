// Barer som saknar pris — besökare kan föreslå vad ölen kostar
// Sorteras efter Google-betyg så att de mest besökta barerna kommer först

import { ArrowLeft } from 'lucide-react'
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
    <div className="min-h-screen bg-ink">
      {/* Header */}
      <header className="bg-ink/95 backdrop-blur-sm border-b border-surface">
        <div className="max-w-2xl mx-auto px-4 py-1 flex items-center gap-3">
          <Link href="/" className="inline-flex items-center min-h-[44px] text-muted hover:text-brand-light transition-colors">
            <ArrowLeft aria-hidden="true" className="w-4 h-4 mr-1" />
            Tillbaka
          </Link>
          <span className="text-line">/</span>
          <Link href="/" className="inline-flex items-center min-h-[44px] text-xl font-display font-bold">
            <span className="text-brand">sunk</span>
            <span className="text-teal">is</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="font-display text-xl font-medium text-cream mb-1">Vet du vad det kostar?</h1>
        <p className="text-sm text-muted mb-6">
          De här barerna saknar pris. Skicka in vad en öl kostar så granskar vi det och lägger upp baren i listan.
        </p>

        {bars.length === 0 ? (
          <p className="text-sm text-muted">Alla barer har pris just nu. Tack!</p>
        ) : (
          <ul className="space-y-2">
            {bars.map(bar => (
              <li key={bar.id} className="bg-surface rounded-xl border border-line p-4 space-y-3">
                <div>
                  <Link href={`/bar/${bar.id}`} className="font-medium text-cream hover:text-brand-light transition-colors">
                    {bar.name}
                  </Link>
                  <p className="text-sm text-muted">
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

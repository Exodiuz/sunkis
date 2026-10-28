// Startsidan — rankinglista med filter och sökruta
// Hämtar data server-side och skickar till klient-komponenten

import { supabase } from '@/lib/supabase'
import HomeClient from './HomeClient'

// Hämtar granskade barer — ogranskade inskick från /submit visas inte (D6)
// Slutlig sortering (pris per 40 cl, happy hour) görs i HomeClient
async function getBars() {
  const { data, error } = await supabase
    .from('bars')
    .select('*')
    .eq('price_verified', true)
    .order('price_40cl', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('Fel vid hämtning av barer:', error)
    return []
  }
  return data ?? []
}

// Antal barer (granskade eller inte) som helt saknar pris — visas som uppmaning (D2)
async function getMissingPriceCount() {
  const { count, error } = await supabase
    .from('bars')
    .select('id', { count: 'exact', head: true })
    .is('price_40cl', null)
    .is('price_50cl', null)

  if (error) {
    console.error('Fel vid räkning av barer utan pris:', error)
    return 0
  }
  return count ?? 0
}

// Revalidera sidan var 5:e minut
export const revalidate = 300

export default async function HomePage() {
  const [bars, missingPriceCount] = await Promise.all([getBars(), getMissingPriceCount()])

  return <HomeClient bars={bars} missingPriceCount={missingPriceCount} renderedAt={Date.now()} />
}

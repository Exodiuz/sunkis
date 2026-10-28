// Startsidan — rankinglista med filter och sökruta
// Hämtar data server-side och skickar till klient-komponenten

import { supabase } from '@/lib/supabase'
import HomeClient from './HomeClient'

// Hämtar alla barer sorterade billigast → dyrast
// Barer utan pris hamnar längst ned (nullsFirst: false)
async function getBars() {
  const { data, error } = await supabase
    .from('bars')
    .select('*')
    .order('price_40cl', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('Fel vid hämtning av barer:', error)
    return []
  }
  return data ?? []
}

// Revalidera sidan var 5:e minut
export const revalidate = 300

export default async function HomePage() {
  const bars = await getBars()

  return <HomeClient bars={bars} renderedAt={Date.now()} />
}

// Kartsidan — visar alla barer med MapLibre GL
// Filtrering och kartan ligger i MapClient (klientkomponent)

import { supabase } from '@/lib/supabase'
import MapClient from './MapClient'

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

  // Filtren läses från URL:en i klienten, så sidan kan förbli statisk (K1)
  return <MapClient bars={bars} renderedAt={Date.now()} />
}

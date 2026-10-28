// Kartsidan — visar alla granskade barer med MapLibre GL
// Filtrering och kartan ligger i MapClient (klientkomponent)

import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { MAP_COLUMNS, MAP_VISIBILITY_FILTER, type MapBar } from '@/lib/mapBars'
import MapClient from './MapClient'

export const metadata: Metadata = {
  title: 'Karta — Sunkis',
  description: 'Billigaste ölet i Stockholm på kartan. Se priset vid varje bar, happy hour just nu och vägen dit.',
}

// Granskade barer med koordinater, även de som saknar pris (grå prickar).
// Ogranskade inskick från /submit visas inte (D6).
async function getBars(): Promise<MapBar[]> {
  const { data, error } = await supabase
    .from('bars')
    .select(MAP_COLUMNS)
    .or(MAP_VISIBILITY_FILTER)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .returns<MapBar[]>()

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

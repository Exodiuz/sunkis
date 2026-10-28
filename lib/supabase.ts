// Supabase-klient — används av hela appen
// Importerar createClient och definierar typerna för databasen

import { createClient } from '@supabase/supabase-js'

// Databastyperna speglar schemat i Supabase
export type Bar = {
  id: string
  google_place_id: string | null
  name: string
  address: string | null
  area: string | null
  lat: number | null
  lng: number | null
  opening_hours: Record<string, string> | null
  google_rating: number | null
  photo_url: string | null
  website: string | null
  phone: string | null
  price_40cl: number | null
  price_50cl: number | null
  happy_hour_price: number | null
  happy_hour_start: string | null  // t.ex. "15:00"
  happy_hour_end: string | null    // t.ex. "18:00"
  happy_hour_days: string[] | null // t.ex. ["monday","tuesday"]
  happy_hour_size: string | null   // "33cl" | "40cl" | "50cl"
  sunk_factor: number
  sunk_votes: number
  price_verified: boolean
  price_thumbs_up: number
  price_thumbs_down: number
  created_at: string
  updated_at: string
}

// Skapar en Supabase-klient för användning i webbläsaren (anon-nyckel)
// Fallback-URL används vid build-tid om miljövariabler saknas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Skapar en admin-klient med service role — används bara server-side
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceRoleKey)
}

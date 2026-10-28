// missing-prices.js — Listar barer utan pris, sorterade efter Google-betyg
// Används för att välja ut vilka barer vi ska seeda priser för först.
//
// Kör med:
//   node scripts/missing-prices.js            # topp 100 som tabell
//   node scripts/missing-prices.js 50         # topp 50
//   node scripts/missing-prices.js 100 --csv  # CSV till stdout
//
// Kräver i .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY (eller NEXT_PUBLIC_SUPABASE_ANON_KEY)

const path = require('path')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Ladda miljövariabler från .env.local manuellt (inte dotenv-beroende)
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local saknas! Kopiera .env.example och fyll i dina nycklar.')
    process.exit(1)
  }
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const [key, ...rest] = trimmed.split('=')
    if (key && rest.length > 0) process.env[key.trim()] = rest.join('=').trim()
  })
}

// Citerar ett CSV-fält om det behövs
function csv(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

async function main() {
  loadEnv()

  const args = process.argv.slice(2)
  const limit = Number(args.find(a => /^\d+$/.test(a)) ?? 100)
  const asCsv = args.includes('--csv')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  const { data, error } = await supabase
    .from('bars')
    .select('id, name, area, address, google_rating, google_place_id')
    .is('price_40cl', null)
    .is('price_50cl', null)
    .order('google_rating', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('❌ Kunde inte hämta barer:', error.message)
    process.exit(1)
  }

  if (asCsv) {
    console.log('rank,name,area,address,google_rating,id,google_place_id')
    data.forEach((bar, i) => {
      console.log([i + 1, bar.name, bar.area, bar.address, bar.google_rating, bar.id, bar.google_place_id].map(csv).join(','))
    })
    return
  }

  console.log(`🍺 ${data.length} barer utan pris (högst betyg först)\n`)
  console.table(data.map((bar, i) => ({
    '#': i + 1,
    namn: bar.name,
    område: bar.area ?? '',
    betyg: bar.google_rating ?? '',
    id: bar.id,
  })))
}

main()

// seed-bars.js — Hämtar barer från Google Places API och sparar till Supabase
// Kör med: node scripts/seed-bars.js
//
// Kräver följande i .env.local:
//   GOOGLE_PLACES_API_KEY=din-nyckel
//   NEXT_PUBLIC_SUPABASE_URL=din-url
//   SUPABASE_SERVICE_ROLE_KEY=din-service-role-nyckel

const https = require('https')
const path = require('path')
const fs = require('fs')

// Ladda miljövariabler från .env.local manuellt (inte dotenv-beroende)
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local saknas! Kopiera .env.example och fyll i dina nycklar.')
    process.exit(1)
  }
  const content = fs.readFileSync(envPath, 'utf8')
  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const [key, ...rest] = trimmed.split('=')
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join('=').trim()
    }
  })
}

loadEnv()

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Stockholms centrum (koordinater)
const STOCKHOLM_CENTER = { lat: 59.3293, lng: 18.0686 }
const RADIUS = 10000 // 10km

// Väntar ett visst antal millisekunder (Google kräver fördröjning mellan page-anrop)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Gör en HTTP GET-förfrågan och returnerar JSON
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error(`Kunde inte parsa JSON: ${e.message}`))
        }
      })
    }).on('error', reject)
  })
}

// ─────────────────────────────────────────────
// STEG 1 — Nearby Search med pagination
// ─────────────────────────────────────────────
async function fetchAllBars() {
  const bars = []
  let pageToken = null
  let page = 1

  console.log('🔍 Steg 1: Hämtar barer via Nearby Search...')

  do {
    // Bygg URL — lägg till pagetoken om vi har en
    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`
      + `?location=${STOCKHOLM_CENTER.lat},${STOCKHOLM_CENTER.lng}`
      + `&radius=${RADIUS}`
      + `&type=bar`
      + `&key=${GOOGLE_API_KEY}`

    if (pageToken) {
      url += `&pagetoken=${pageToken}`
    }

    const data = await fetchJson(url)

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`❌ API-fel (sida ${page}): ${data.status} — ${data.error_message ?? ''}`)
      break
    }

    const results = data.results ?? []
    bars.push(...results)
    console.log(`  Sida ${page}: ${results.length} barer hämtade (totalt: ${bars.length})`)

    pageToken = data.next_page_token ?? null
    page++

    // Google kräver 2 sekunders väntetid innan nästa page-anrop
    if (pageToken) {
      console.log('  Väntar 2 sekunder...')
      await sleep(2000)
    }
  } while (pageToken && page <= 3) // max 3 sidor = ~180 barer

  return bars
}

// ─────────────────────────────────────────────
// STEG 2 — Place Details per bar
// ─────────────────────────────────────────────
async function fetchBarDetails(placeId) {
  const fields = [
    'name', 'formatted_address', 'geometry',
    'opening_hours', 'rating', 'photos',
    'website', 'formatted_phone_number'
  ].join(',')

  const url = `https://maps.googleapis.com/maps/api/place/details/json`
    + `?place_id=${placeId}`
    + `&fields=${fields}`
    + `&key=${GOOGLE_API_KEY}`

  const data = await fetchJson(url)

  if (data.status !== 'OK') {
    return null
  }

  return data.result
}

// ─────────────────────────────────────────────
// STEG 3 — Bestäm stadsdel baserat på koordinater
// ─────────────────────────────────────────────
function determineArea(lat, lng) {
  if (lat >= 59.31 && lat <= 59.325 && lng >= 18.04 && lng <= 18.10) {
    return 'Södermalm'
  }
  if (lat >= 59.32 && lat <= 59.34 && lng >= 17.99 && lng <= 18.04) {
    return 'Kungsholmen'
  }
  if (lat >= 59.33 && lat <= 59.35 && lng >= 18.03 && lng <= 18.07) {
    return 'Vasastan'
  }
  if (lat >= 59.33 && lat <= 59.35 && lng >= 18.07 && lng <= 18.12) {
    return 'Östermalm'
  }
  return 'Norrmalm' // samma benämning som databasen (normalize_area)
}

// Konverterar Google Places öppettider till vårt JSONB-format
function parseOpeningHours(googleHours) {
  if (!googleHours?.periods) return null

  const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const result = {}

  for (const period of googleHours.periods) {
    const dayName = DAYS[period.open?.day ?? 0]
    if (!dayName) continue

    if (!period.close) {
      // Öppet dygnet runt
      result[dayName] = '00:00–24:00'
    } else {
      const open = `${period.open.time.slice(0,2)}:${period.open.time.slice(2)}`
      const close = `${period.close.time.slice(0,2)}:${period.close.time.slice(2)}`
      result[dayName] = `${open}–${close}`
    }
  }

  return result
}

// ─────────────────────────────────────────────
// STEG 4 — Spara till Supabase via REST API
// ─────────────────────────────────────────────
async function upsertBar(barData) {
  const url = `${SUPABASE_URL}/rest/v1/bars`

  return new Promise((resolve, reject) => {
    const body = JSON.stringify(barData)
    const urlObj = new URL(url)

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + '?on_conflict=google_place_id',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ─────────────────────────────────────────────
// HUVUDFUNKTION
// ─────────────────────────────────────────────
async function main() {
  console.log('🍺 Sunkis seed-script startar...\n')

  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'din-google-api-nyckel') {
    console.error('❌ GOOGLE_PLACES_API_KEY saknas i .env.local')
    process.exit(1)
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Supabase-konfiguration saknas i .env.local')
    process.exit(1)
  }

  // STEG 1 — Hämta alla barer
  const rawBars = await fetchAllBars()
  console.log(`\n✅ Totalt hittade: ${rawBars.length} barer\n`)

  // STEG 2 — Hämta detaljer och spara
  console.log('📋 Steg 2–4: Hämtar detaljer och sparar till Supabase...\n')

  let saved = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < rawBars.length; i++) {
    const raw = rawBars[i]
    const placeId = raw.place_id

    // Kort paus för att inte överbelasta API
    if (i > 0 && i % 10 === 0) {
      await sleep(500)
    }

    try {
      // Hämta detaljer
      const details = await fetchBarDetails(placeId)
      if (!details) {
        skipped++
        continue
      }

      const lat = details.geometry?.location?.lat
      const lng = details.geometry?.location?.lng
      const area = lat && lng ? determineArea(lat, lng) : null

      // Hämta foto-URL (första fotot om det finns)
      let photoUrl = null
      if (details.photos && details.photos.length > 0) {
        const photoRef = details.photos[0].photo_reference
        photoUrl = `https://maps.googleapis.com/maps/api/place/photo`
          + `?maxwidth=800&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`
      }

      // Bygg bar-objektet för databasen
      const barData = {
        google_place_id: placeId,
        name: details.name ?? raw.name,
        address: details.formatted_address ?? null,
        area,
        lat,
        lng,
        opening_hours: parseOpeningHours(details.opening_hours),
        google_rating: details.rating ?? null,
        photo_url: photoUrl,
        website: details.website ?? null,
        phone: details.formatted_phone_number ?? null,
        // Priser lämnas tomma — fylls i via admin
        price_40cl: null,
        price_50cl: null,
        happy_hour_price: null,
        sunk_factor: 0,
        sunk_votes: 0,
        price_verified: false,
        price_thumbs_up: 0,
        price_thumbs_down: 0,
      }

      const result = await upsertBar(barData)

      if (result.status === 200 || result.status === 201) {
        saved++
        if (i % 20 === 0) {
          console.log(`  [${i+1}/${rawBars.length}] ✓ ${barData.name} (${area})`)
        }
      } else {
        console.warn(`  ⚠️  ${barData.name}: HTTP ${result.status}`)
        skipped++
      }
    } catch (err) {
      console.error(`  ❌ Fel för placeId ${placeId}: ${err.message}`)
      errors++
    }
  }

  // STEG 5 — Logga resultat
  console.log('\n════════════════════════════════')
  console.log('📊 Resultat:')
  console.log(`  Totalt hämtade:   ${rawBars.length}`)
  console.log(`  Sparade/uppdaterade: ${saved}`)
  console.log(`  Skippade:         ${skipped}`)
  console.log(`  Fel:              ${errors}`)
  console.log('════════════════════════════════')
  console.log('\n✅ Klart! Logga in på /admin för att fylla i priser.')
}

main().catch(err => {
  console.error('Oväntat fel:', err)
  process.exit(1)
})

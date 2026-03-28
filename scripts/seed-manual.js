// seed-manual.js — Testdata med realistiska Stockholms-barer
// Kör med: node scripts/seed-manual.js

const https = require('https')
const path = require('path')
const fs = require('fs')

// Ladda miljövariabler från .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local saknas!')
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// ─────────────────────────────────────────────
// 12 realistiska Stockholms-barer med testpriser
// ─────────────────────────────────────────────
const BARS = [
  {
    name: 'Nivå 22',
    address: 'Fridhemsgatan 17, Kungsholmen',
    area: 'Kungsholmen',
    lat: 59.3322,
    lng: 18.0107,
    price_40cl: 25,
    price_50cl: null,
    happy_hour_price: 20,
    happy_hour_start: '15:00',
    happy_hour_end: '18:00',
    happy_hour_days: ['monday','tuesday','wednesday','thursday','friday'],
    sunk_factor: 4.5,
    sunk_votes: 38,
    google_rating: 4.1,
    opening_hours: {
      monday:    '15:00–01:00',
      tuesday:   '15:00–01:00',
      wednesday: '15:00–01:00',
      thursday:  '15:00–01:00',
      friday:    '15:00–02:00',
      saturday:  '14:00–02:00',
      sunday:    '15:00–01:00',
    },
  },
  {
    name: 'The International Bar',
    address: 'Folkungagatan 84, Södermalm',
    area: 'Södermalm',
    lat: 59.3156,
    lng: 18.0766,
    price_40cl: 29,
    price_50cl: null,
    happy_hour_price: 25,
    happy_hour_start: '11:00',
    happy_hour_end: '18:00',
    happy_hour_days: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
    sunk_factor: 5.0,
    sunk_votes: 112,
    google_rating: 4.4,
    opening_hours: {
      monday:    '11:00–01:00',
      tuesday:   '11:00–01:00',
      wednesday: '11:00–01:00',
      thursday:  '11:00–01:00',
      friday:    '11:00–03:00',
      saturday:  '11:00–03:00',
      sunday:    '12:00–01:00',
    },
  },
  {
    name: 'Dovas Hornstull',
    address: 'Långholmsgatan 12, Södermalm',
    area: 'Södermalm',
    lat: 59.3172,
    lng: 18.0332,
    price_40cl: null,
    price_50cl: 39,
    happy_hour_price: 35,
    happy_hour_start: '13:00',
    happy_hour_end: '17:00',
    happy_hour_days: ['monday','tuesday','wednesday','thursday','friday'],
    sunk_factor: 3.5,
    sunk_votes: 27,
    google_rating: 3.8,
    opening_hours: {
      monday:    '13:00–01:00',
      tuesday:   '13:00–01:00',
      wednesday: '13:00–01:00',
      thursday:  '13:00–01:00',
      friday:    '13:00–03:00',
      saturday:  '11:00–03:00',
      sunday:    '11:00–01:00',
    },
  },
  {
    name: 'Pub Anchor',
    address: 'Tjärhovsgatan 15, Södermalm',
    area: 'Södermalm',
    lat: 59.3148,
    lng: 18.0801,
    price_40cl: null,
    price_50cl: 35,
    happy_hour_price: 30,
    happy_hour_start: '16:00',
    happy_hour_end: '19:00',
    happy_hour_days: ['monday','tuesday','wednesday','thursday','friday'],
    sunk_factor: 4.0,
    sunk_votes: 55,
    google_rating: 4.2,
    opening_hours: {
      monday:    '16:00–01:00',
      tuesday:   '16:00–01:00',
      wednesday: '16:00–01:00',
      thursday:  '16:00–01:00',
      friday:    '15:00–02:00',
      saturday:  '13:00–02:00',
      sunday:    '14:00–01:00',
    },
  },
  {
    name: 'Akkurat',
    address: 'Hornsgatan 18, Södermalm',
    area: 'Södermalm',
    lat: 59.3183,
    lng: 18.0588,
    price_40cl: 49,
    price_50cl: 59,
    happy_hour_price: null,
    sunk_factor: 2.0,
    sunk_votes: 19,
    google_rating: 4.5,
    opening_hours: {
      monday:    'stängt',
      tuesday:   '17:00–01:00',
      wednesday: '17:00–01:00',
      thursday:  '17:00–01:00',
      friday:    '17:00–02:00',
      saturday:  '14:00–02:00',
      sunday:    '15:00–01:00',
    },
  },
  {
    name: 'Snotty Soundbar',
    address: 'Skånegatan 90, Södermalm',
    area: 'Södermalm',
    lat: 59.3126,
    lng: 18.0811,
    price_40cl: 45,
    price_50cl: null,
    happy_hour_price: 38,
    happy_hour_start: '17:00',
    happy_hour_end: '20:00',
    happy_hour_days: ['wednesday','thursday','friday'],
    sunk_factor: 3.8,
    sunk_votes: 31,
    google_rating: 4.3,
    opening_hours: {
      monday:    'stängt',
      tuesday:   'stängt',
      wednesday: '17:00–01:00',
      thursday:  '17:00–01:00',
      friday:    '17:00–03:00',
      saturday:  '15:00–03:00',
      sunday:    'stängt',
    },
  },
  {
    name: 'Lemon Bar',
    address: 'Odengatan 80, Vasastan',
    area: 'Vasastan',
    lat: 59.3428,
    lng: 18.0521,
    price_40cl: 39,
    price_50cl: 49,
    happy_hour_price: 35,
    happy_hour_start: '16:00',
    happy_hour_end: '18:00',
    happy_hour_days: ['monday','tuesday','wednesday','thursday','friday'],
    sunk_factor: 3.2,
    sunk_votes: 22,
    google_rating: 4.0,
    opening_hours: {
      monday:    '16:00–01:00',
      tuesday:   '16:00–01:00',
      wednesday: '16:00–01:00',
      thursday:  '16:00–01:00',
      friday:    '16:00–02:00',
      saturday:  '14:00–02:00',
      sunday:    'stängt',
    },
  },
  {
    name: 'Olsons Skafferi',
    address: 'Rörstrandsgatan 4, Vasastan',
    area: 'Vasastan',
    lat: 59.3398,
    lng: 18.0461,
    price_40cl: 55,
    price_50cl: 65,
    happy_hour_price: null,
    sunk_factor: 1.5,
    sunk_votes: 8,
    google_rating: 4.6,
    opening_hours: {
      monday:    'stängt',
      tuesday:   '17:00–23:00',
      wednesday: '17:00–23:00',
      thursday:  '17:00–00:00',
      friday:    '17:00–01:00',
      saturday:  '15:00–01:00',
      sunday:    '14:00–22:00',
    },
  },
  {
    name: 'Ölkaféet',
    address: 'Surbrunnsgatan 46, Vasastan',
    area: 'Vasastan',
    lat: 59.3415,
    lng: 18.0498,
    price_40cl: 42,
    price_50cl: 52,
    happy_hour_price: 38,
    happy_hour_start: '15:00',
    happy_hour_end: '17:00',
    happy_hour_days: ['monday','tuesday','wednesday','thursday','friday'],
    sunk_factor: 2.8,
    sunk_votes: 14,
    google_rating: 4.1,
    opening_hours: {
      monday:    '15:00–23:00',
      tuesday:   '15:00–23:00',
      wednesday: '15:00–23:00',
      thursday:  '15:00–00:00',
      friday:    '14:00–01:00',
      saturday:  '13:00–01:00',
      sunday:    '14:00–22:00',
    },
  },
  {
    name: 'Spy Bar',
    address: 'Birger Jarlsgatan 20, Östermalm',
    area: 'Östermalm',
    lat: 59.3358,
    lng: 18.0736,
    price_40cl: 75,
    price_50cl: 95,
    happy_hour_price: null,
    sunk_factor: 1.0,
    sunk_votes: 45,
    google_rating: 3.5,
    opening_hours: {
      monday:    'stängt',
      tuesday:   'stängt',
      wednesday: 'stängt',
      thursday:  '22:00–03:00',
      friday:    '22:00–05:00',
      saturday:  '22:00–05:00',
      sunday:    'stängt',
    },
  },
  {
    name: 'Monks American Ale House',
    address: 'Munkbrogatan 11, City',
    area: 'City',
    lat: 59.3249,
    lng: 18.0679,
    price_40cl: 59,
    price_50cl: 72,
    happy_hour_price: 49,
    happy_hour_start: '15:00',
    happy_hour_end: '18:00',
    happy_hour_days: ['monday','tuesday','wednesday','thursday','friday'],
    sunk_factor: 2.5,
    sunk_votes: 33,
    google_rating: 4.3,
    opening_hours: {
      monday:    '15:00–01:00',
      tuesday:   '15:00–01:00',
      wednesday: '15:00–01:00',
      thursday:  '15:00–01:00',
      friday:    '14:00–02:00',
      saturday:  '13:00–02:00',
      sunday:    '14:00–01:00',
    },
  },
  {
    name: 'O Learys Kungsholmen',
    address: 'Hantverkargatan 20, Kungsholmen',
    area: 'Kungsholmen',
    lat: 59.3296,
    lng: 18.0512,
    price_40cl: 55,
    price_50cl: 65,
    happy_hour_price: 45,
    happy_hour_start: '16:00',
    happy_hour_end: '18:00',
    happy_hour_days: ['monday','tuesday','wednesday','thursday','friday'],
    sunk_factor: 2.2,
    sunk_votes: 17,
    google_rating: 3.9,
    opening_hours: {
      monday:    '16:00–01:00',
      tuesday:   '16:00–01:00',
      wednesday: '16:00–01:00',
      thursday:  '16:00–01:00',
      friday:    '15:00–02:00',
      saturday:  '12:00–02:00',
      sunday:    '14:00–01:00',
    },
  },
]

// Sparar en bar till Supabase via REST API
function upsertBar(barData) {
  return new Promise((resolve, reject) => {
    const fullData = {
      ...barData,
      price_verified: true, // testdata är "verifierad"
      price_thumbs_up: Math.floor(Math.random() * 20),
      price_thumbs_down: Math.floor(Math.random() * 3),
    }

    const body = JSON.stringify(fullData)
    const urlObj = new URL(`${SUPABASE_URL}/rest/v1/bars`)

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
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

async function main() {
  console.log('🍺 Sunkis testdata-seed startar...\n')

  if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder') || SUPABASE_URL.includes('din-')) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL saknas eller är en platshållare i .env.local')
    console.error('   Fyll i din riktiga Supabase-URL från app.supabase.com > Settings > API')
    process.exit(1)
  }
  if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY.includes('din-')) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY saknas i .env.local')
    process.exit(1)
  }

  let saved = 0
  let errors = 0

  for (const bar of BARS) {
    try {
      const result = await upsertBar(bar)
      if (result.status === 200 || result.status === 201) {
        const price = bar.price_40cl ? `${bar.price_40cl} kr/40cl` : `${bar.price_50cl} kr/50cl`
        console.log(`  ✓ ${bar.name.padEnd(30)} ${price.padEnd(12)} ${bar.area}`)
        saved++
      } else {
        console.warn(`  ⚠️  ${bar.name}: HTTP ${result.status} — ${result.body}`)
        errors++
      }
    } catch (err) {
      console.error(`  ❌ ${bar.name}: ${err.message}`)
      errors++
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Klart! ${saved} barer sparade, ${errors} fel.`)
  if (saved > 0) {
    console.log('\nÖppna http://localhost:3000 för att se rankinglistan!')
    console.log('Logga in på /admin för att redigera priser.')
  }
}

main().catch(err => {
  console.error('\nOväntat fel:', err.message)
  process.exit(1)
})

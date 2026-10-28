// verify-rls.js — Kontrollerar att anon-nyckeln inte kan ändra eller radera barer (D5)
// Kör med: node scripts/verify-rls.js
//
// Kräver i .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY

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

loadEnv()

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

async function main() {
  let failures = 0
  const check = (ok, label) => {
    console.log(`${ok ? '✅' : '❌'} ${label}`)
    if (!ok) failures++
  }

  const { data: bar, error } = await anon.from('bars').select('id, name').limit(1).single()
  if (error || !bar) {
    console.error('❌ Kunde inte läsa någon bar att testa mot:', error)
    process.exit(1)
  }

  // UPDATE utan policy ger inget fel men påverkar 0 rader
  const upd = await anon.from('bars').update({ name: bar.name }).eq('id', bar.id).select('id')
  check(!upd.error ? upd.data.length === 0 : true, 'anon kan inte uppdatera bars')

  const del = await anon.from('bars').delete().eq('id', bar.id).select('id')
  check(!del.error ? del.data.length === 0 : true, 'anon kan inte radera bars')

  const ins = await anon.from('bars').insert({ name: 'RLS-test (ska nekas)', price_verified: true })
  check(!!ins.error, 'anon kan inte skapa verifierade barer')

  const vote = await anon.from('price_votes').insert({ bar_id: bar.id, vote: 'up' })
  check(!!vote.error, 'anon kan inte skriva direkt till price_votes')

  const sunk = await anon.from('sunk_votes').insert({ bar_id: bar.id, score: 3 })
  check(!!sunk.error, 'anon kan inte skriva direkt till sunk_votes')

  if (failures > 0) {
    console.error(`\n${failures} kontroll(er) misslyckades — har migrationerna körts?`)
    process.exit(1)
  }
  console.log('\nAlla kontroller gick igenom.')
}

main()

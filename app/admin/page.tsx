// Admin-panel — lösenordsskyddad vy för att hantera barer och priser
// Tre vyer: barer utan pris, prisröstningar, alla barer

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Bar } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

// Veckodagar för happy hour-val
const WEEKDAYS = [
  { value: 'monday', label: 'Mån' },
  { value: 'tuesday', label: 'Tis' },
  { value: 'wednesday', label: 'Ons' },
  { value: 'thursday', label: 'Tor' },
  { value: 'friday', label: 'Fre' },
  { value: 'saturday', label: 'Lör' },
  { value: 'sunday', label: 'Sön' },
]

type View = 'login' | 'no-price' | 'votes' | 'all'

export default function AdminPage() {
  const [view, setView] = useState<View>('login')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [bars, setBars] = useState<Bar[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingBar, setEditingBar] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Formulärstate för redigering
  const [editForm, setEditForm] = useState({
    price_40cl: '',
    price_50cl: '',
    happy_hour_price: '',
    happy_hour_start: '',
    happy_hour_end: '',
    happy_hour_days: [] as string[],
    sunk_factor: '3',
  })

  // Loggar in via API-route
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      setView('no-price')
      loadBars()
    } else {
      setLoginError('Fel lösenord')
    }
  }

  // Hämtar barer från Supabase
  const loadBars = useCallback(async () => {
    const { data } = await supabase.from('bars').select('*').order('created_at', { ascending: false })
    if (data) setBars(data)
  }, [])

  useEffect(() => {
    if (view !== 'login') loadBars()
  }, [view, loadBars])

  // Skriver till bars via server-routen (anon-nyckeln får inte uppdatera, se D5)
  async function adminUpdate(barId: string, update: Record<string, unknown>) {
    const res = await fetch(`/api/admin/bars/${barId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
    if (!res.ok) {
      alert('Kunde inte spara — logga in igen.')
      throw new Error(`Admin-uppdatering misslyckades: ${res.status}`)
    }
  }

  // Öppnar redigeringsformuläret för en bar
  function startEdit(bar: Bar) {
    setEditingBar(bar.id)
    setEditForm({
      price_40cl: bar.price_40cl?.toString() ?? '',
      price_50cl: bar.price_50cl?.toString() ?? '',
      happy_hour_price: bar.happy_hour_price?.toString() ?? '',
      happy_hour_start: bar.happy_hour_start ?? '',
      happy_hour_end: bar.happy_hour_end ?? '',
      happy_hour_days: bar.happy_hour_days ?? [],
      sunk_factor: bar.sunk_factor?.toString() ?? '3',
    })
  }

  // Sparar redigerade uppgifter
  async function saveBar(barId: string) {
    setSaving(true)
    try {
      await adminUpdate(barId, {
        price_40cl: editForm.price_40cl ? parseInt(editForm.price_40cl) : null,
        price_50cl: editForm.price_50cl ? parseInt(editForm.price_50cl) : null,
        happy_hour_price: editForm.happy_hour_price ? parseInt(editForm.happy_hour_price) : null,
        happy_hour_start: editForm.happy_hour_start || null,
        happy_hour_end: editForm.happy_hour_end || null,
        happy_hour_days: editForm.happy_hour_days.length > 0 ? editForm.happy_hour_days : null,
        sunk_factor: parseFloat(editForm.sunk_factor),
        price_verified: true,
        updated_at: new Date().toISOString(),
      })
      setEditingBar(null)
      loadBars()
    } catch (e) {
      console.error('Fel vid sparande:', e)
    } finally {
      setSaving(false)
    }
  }

  // Nollställer prisröstningar
  async function resetVotes(barId: string) {
    await adminUpdate(barId, { price_thumbs_up: 0, price_thumbs_down: 0, price_verified: true })
    loadBars()
  }

  // Tar bort en bar
  async function deleteBar(barId: string, name: string) {
    if (!confirm(`Ta bort "${name}"? Det går inte att ångra.`)) return
    const res = await fetch(`/api/admin/bars/${barId}`, { method: 'DELETE' })
    if (!res.ok) alert('Kunde inte ta bort baren — logga in igen.')
    loadBars()
  }

  // Togglar dag i happy hour
  function toggleDay(day: string) {
    setEditForm(prev => ({
      ...prev,
      happy_hour_days: prev.happy_hour_days.includes(day)
        ? prev.happy_hour_days.filter(d => d !== day)
        : [...prev.happy_hour_days, day],
    }))
  }

  // Filtrera barer baserat på vy och sök
  const filteredBars = bars.filter(b => {
    const matchSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.area ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchSearch
  })

  const noPriceBars = filteredBars.filter(b => !b.price_40cl && !b.price_50cl)
  const voteBars = [...filteredBars].sort((a, b) => b.price_thumbs_down - a.price_thumbs_down)

  // Inloggningsvy
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#1a1a18] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <Link href="/" className="block mb-6 text-center">
            <span className="text-3xl font-medium">
              <span className="text-[#EF9F27]">sunk</span>
              <span className="text-[#F5C55B]">is</span>
            </span>
          </Link>
          <div className="bg-[#2c2c2a] rounded-xl p-6 space-y-4">
            <h1 className="text-lg font-medium text-[#F1EFE8] text-center">Admin</h1>
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Lösenord"
                className="w-full px-3 py-2.5 bg-[#1a1a18] border border-[#3a3a38] rounded-lg text-[#F1EFE8] placeholder-[#888780] text-sm focus:outline-none focus:border-[#BA7517] transition-colors"
              />
              {loginError && <p className="text-sm text-[#f87171]">{loginError}</p>}
              <button
                type="submit"
                className="w-full py-2.5 bg-[#BA7517] hover:bg-[#EF9F27] text-white rounded-lg font-medium transition-colors"
              >
                Logga in
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Inline-redigeringsformulär
  function EditForm({ bar }: { bar: Bar }) {
    return (
      <div className="mt-3 p-4 bg-[#1a1a18] rounded-lg border border-[#BA7517]/30 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#888780] mb-1">Pris 40cl (kr)</label>
            <input type="number" value={editForm.price_40cl}
              onChange={e => setEditForm(p => ({ ...p, price_40cl: e.target.value }))}
              className="w-full px-2 py-1.5 bg-[#2c2c2a] border border-[#3a3a38] rounded text-[#F1EFE8] text-sm focus:outline-none focus:border-[#BA7517]" />
          </div>
          <div>
            <label className="block text-xs text-[#888780] mb-1">Pris 50cl (kr)</label>
            <input type="number" value={editForm.price_50cl}
              onChange={e => setEditForm(p => ({ ...p, price_50cl: e.target.value }))}
              className="w-full px-2 py-1.5 bg-[#2c2c2a] border border-[#3a3a38] rounded text-[#F1EFE8] text-sm focus:outline-none focus:border-[#BA7517]" />
          </div>
          <div>
            <label className="block text-xs text-[#888780] mb-1">HH-pris (kr)</label>
            <input type="number" value={editForm.happy_hour_price}
              onChange={e => setEditForm(p => ({ ...p, happy_hour_price: e.target.value }))}
              className="w-full px-2 py-1.5 bg-[#2c2c2a] border border-[#3a3a38] rounded text-[#F1EFE8] text-sm focus:outline-none focus:border-[#BA7517]" />
          </div>
          <div>
            <label className="block text-xs text-[#888780] mb-1">Sunkfaktor (1–5)</label>
            <input type="number" min="1" max="5" step="0.5" value={editForm.sunk_factor}
              onChange={e => setEditForm(p => ({ ...p, sunk_factor: e.target.value }))}
              className="w-full px-2 py-1.5 bg-[#2c2c2a] border border-[#3a3a38] rounded text-[#F1EFE8] text-sm focus:outline-none focus:border-[#BA7517]" />
          </div>
          <div>
            <label className="block text-xs text-[#888780] mb-1">HH start</label>
            <input type="time" value={editForm.happy_hour_start}
              onChange={e => setEditForm(p => ({ ...p, happy_hour_start: e.target.value }))}
              className="w-full px-2 py-1.5 bg-[#2c2c2a] border border-[#3a3a38] rounded text-[#F1EFE8] text-sm focus:outline-none focus:border-[#BA7517]" />
          </div>
          <div>
            <label className="block text-xs text-[#888780] mb-1">HH slut</label>
            <input type="time" value={editForm.happy_hour_end}
              onChange={e => setEditForm(p => ({ ...p, happy_hour_end: e.target.value }))}
              className="w-full px-2 py-1.5 bg-[#2c2c2a] border border-[#3a3a38] rounded text-[#F1EFE8] text-sm focus:outline-none focus:border-[#BA7517]" />
          </div>
        </div>
        {/* HH-dagar */}
        <div>
          <label className="block text-xs text-[#888780] mb-2">HH-dagar</label>
          <div className="flex gap-1.5 flex-wrap">
            {WEEKDAYS.map(({ value, label }) => (
              <button key={value} type="button" onClick={() => toggleDay(value)}
                className={`px-2 py-1 rounded text-xs border transition-colors ${
                  editForm.happy_hour_days.includes(value)
                    ? 'bg-[#BA7517] border-[#BA7517] text-white'
                    : 'bg-transparent border-[#3a3a38] text-[#888780]'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => saveBar(bar.id)} disabled={saving}
            className="px-4 py-1.5 bg-[#BA7517] hover:bg-[#EF9F27] text-white rounded text-sm transition-colors disabled:opacity-50">
            {saving ? 'Sparar...' : 'Spara & verifiera'}
          </button>
          <button onClick={() => setEditingBar(null)}
            className="px-4 py-1.5 bg-[#2c2c2a] border border-[#3a3a38] text-[#888780] rounded text-sm hover:text-[#F1EFE8] transition-colors">
            Avbryt
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a18]">
      {/* Admin-header */}
      <header className="bg-[#2c2c2a] border-b border-[#3a3a38]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-medium">
            <span className="text-[#EF9F27]">sunk</span>
            <span className="text-[#F5C55B]">is</span>
            <span className="text-[#888780] text-sm ml-2">admin</span>
          </Link>
          <div className="text-xs text-[#888780]">{bars.length} barer totalt</div>
        </div>

        {/* Flikar */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-0">
          {[
            { key: 'no-price', label: `Utan pris (${noPriceBars.length})` },
            { key: 'votes', label: 'Prisröstningar' },
            { key: 'all', label: 'Alla barer' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key as View)}
              className={`px-3 py-2 text-sm border-b-2 transition-colors ${
                view === key
                  ? 'border-[#EF9F27] text-[#EF9F27]'
                  : 'border-transparent text-[#888780] hover:text-[#F1EFE8]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Sökruta (bara för "alla barer"-vyn) */}
        {view === 'all' && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Sök på namn eller stadsdel..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-[#2c2c2a] border border-[#3a3a38] rounded-lg text-[#F1EFE8] placeholder-[#888780] text-sm focus:outline-none focus:border-[#BA7517]"
            />
          </div>
        )}

        {/* VY 1 — Barer utan pris */}
        {view === 'no-price' && (
          <div className="space-y-3">
            <p className="text-sm text-[#888780]">
              Barer som saknar pris — klicka för att fylla i.
            </p>
            {noPriceBars.length === 0 ? (
              <div className="text-center py-8 text-[#888780]">
                <div className="text-3xl mb-2">✅</div>
                <p>Alla barer har pris!</p>
              </div>
            ) : (
              noPriceBars.map(bar => (
                <div key={bar.id} className="bg-[#2c2c2a] rounded-xl p-4 border border-[#3a3a38]">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/bar/${bar.id}`} className="font-medium text-[#F1EFE8] hover:text-[#EF9F27]">
                        {bar.name}
                      </Link>
                      <div className="text-sm text-[#888780]">{bar.area} · {bar.address}</div>
                    </div>
                    <button
                      onClick={() => editingBar === bar.id ? setEditingBar(null) : startEdit(bar)}
                      className="px-3 py-1 bg-[#BA7517] hover:bg-[#EF9F27] text-white rounded text-sm transition-colors"
                    >
                      {editingBar === bar.id ? 'Stäng' : 'Fyll i pris'}
                    </button>
                  </div>
                  {editingBar === bar.id && <EditForm bar={bar} />}
                </div>
              ))
            )}
          </div>
        )}

        {/* VY 2 — Prisröstningar */}
        {view === 'votes' && (
          <div className="space-y-3">
            <p className="text-sm text-[#888780]">
              Sorterat efter antal thumbs down. ⚠️ = 5+ thumbs down (osäkert pris).
            </p>
            {voteBars.map(bar => (
              <div key={bar.id}
                className={`bg-[#2c2c2a] rounded-xl p-4 border ${
                  bar.price_thumbs_down >= 5 ? 'border-[#facc15]/50' : 'border-[#3a3a38]'
                }`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {bar.price_thumbs_down >= 5 && <span className="text-[#facc15]">⚠️</span>}
                      <Link href={`/bar/${bar.id}`} className="font-medium text-[#F1EFE8] hover:text-[#EF9F27]">
                        {bar.name}
                      </Link>
                    </div>
                    <div className="text-sm text-[#888780] mt-0.5">
                      {bar.area}
                      {bar.price_40cl ? ` · ${bar.price_40cl} kr/40cl` : ''}
                      {bar.price_verified ? ' · ✓ verifierad' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">👍 {bar.price_thumbs_up}</span>
                    <span className="text-sm">👎 {bar.price_thumbs_down}</span>
                    <button onClick={() => resetVotes(bar.id)}
                      className="px-3 py-1 bg-[#2c2c2a] border border-[#3a3a38] text-[#888780] rounded text-xs hover:text-[#F1EFE8] hover:border-[#BA7517] transition-colors">
                      Nollställ & verifiera
                    </button>
                    <button onClick={() => editingBar === bar.id ? setEditingBar(null) : startEdit(bar)}
                      className="px-3 py-1 bg-[#BA7517] hover:bg-[#EF9F27] text-white rounded text-xs transition-colors">
                      Redigera
                    </button>
                  </div>
                </div>
                {editingBar === bar.id && <EditForm bar={bar} />}
              </div>
            ))}
          </div>
        )}

        {/* VY 3 — Alla barer */}
        {view === 'all' && (
          <div className="space-y-2">
            {filteredBars.map(bar => (
              <div key={bar.id} className="bg-[#2c2c2a] rounded-xl p-4 border border-[#3a3a38]">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="min-w-0">
                    <Link href={`/bar/${bar.id}`} className="font-medium text-[#F1EFE8] hover:text-[#EF9F27] truncate block">
                      {bar.name}
                    </Link>
                    <div className="flex gap-3 text-sm text-[#888780] flex-wrap mt-0.5">
                      <span>{bar.area ?? '—'}</span>
                      <span>{bar.price_40cl ? `${bar.price_40cl} kr/40cl` : '—'}</span>
                      <span>SF: {bar.sunk_factor?.toFixed(1) ?? '—'}</span>
                      {bar.price_verified && <span className="text-[#4ade80]">✓</span>}
                      <span className="text-[#3a3a38]">
                        {new Date(bar.created_at).toLocaleDateString('sv-SE')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editingBar === bar.id ? setEditingBar(null) : startEdit(bar)}
                      className="px-3 py-1 bg-[#2c2c2a] border border-[#3a3a38] text-[#888780] rounded text-xs hover:border-[#BA7517] hover:text-[#F1EFE8] transition-colors">
                      Redigera
                    </button>
                    <button onClick={() => deleteBar(bar.id, bar.name)}
                      className="px-3 py-1 bg-[#2c2c2a] border border-[#f87171]/30 text-[#f87171]/70 rounded text-xs hover:border-[#f87171] hover:text-[#f87171] transition-colors">
                      Ta bort
                    </button>
                  </div>
                </div>
                {editingBar === bar.id && <EditForm bar={bar} />}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

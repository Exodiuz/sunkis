// Lägg till bar-sidan — formulär för community-bidrag
// Sparas med price_verified = false för admin-granskning

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// Alla veckodagar för happy hour-val
const WEEKDAYS = [
  { value: 'monday', label: 'Mån' },
  { value: 'tuesday', label: 'Tis' },
  { value: 'wednesday', label: 'Ons' },
  { value: 'thursday', label: 'Tor' },
  { value: 'friday', label: 'Fre' },
  { value: 'saturday', label: 'Lör' },
  { value: 'sunday', label: 'Sön' },
]

export default function SubmitPage() {
  // Formulärstate
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [price40, setPrice40] = useState('')
  const [price50, setPrice50] = useState('')
  const [hhPrice, setHhPrice] = useState('')
  const [hhSize, setHhSize] = useState('40cl')
  const [hhStart, setHhStart] = useState('')
  const [hhEnd, setHhEnd] = useState('')
  const [hhDays, setHhDays] = useState<string[]>([])
  const [sunkFactor, setSunkFactor] = useState(3)

  // Status
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Togglar en dag i happy hour-dagarna
  function toggleDay(day: string) {
    setHhDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  // Skickar formuläret till Supabase
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Barens namn är obligatoriskt')
      return
    }

    setLoading(true)
    try {
      const { error: dbError } = await supabase.from('bars').insert({
        name: name.trim(),
        address: address.trim() || null,
        area: area || null,
        price_40cl: price40 ? parseInt(price40) : null,
        price_50cl: price50 ? parseInt(price50) : null,
        happy_hour_price: hhPrice ? parseInt(hhPrice) : null,
        happy_hour_size: hhSize,
        happy_hour_start: hhStart || null,
        happy_hour_end: hhEnd || null,
        happy_hour_days: hhDays.length > 0 ? hhDays : null,
        sunk_factor: sunkFactor,
        price_verified: false, // väntar på admin-verifiering
      })

      if (dbError) throw dbError
      setSubmitted(true)
    } catch (err) {
      console.error('Fel vid inskick:', err)
      setError('Något gick fel. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  // Tack-sida efter inskick
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#1a1a18] flex items-center justify-center px-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="text-5xl">🍺</div>
          <h1 className="text-2xl font-medium text-[#F1EFE8]">Tack!</h1>
          <p className="text-[#888780]">
            Baren har skickats in och granskas av admin. Den syns i listan och på kartan så fort priset är verifierat.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-6 py-3 bg-[#BA7517] text-[#1a1a18] rounded-xl font-medium hover:bg-[#EF9F27] transition-colors"
          >
            Tillbaka till listan
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a18]">
      {/* Header */}
      <header className="bg-[#1a1a18]/95 backdrop-blur-sm border-b border-[#2c2c2a]">
        <div className="max-w-2xl mx-auto px-4 py-1 flex items-center gap-3">
          <Link href="/" className="inline-flex items-center min-h-[44px] text-[#888780] hover:text-[#EF9F27] transition-colors">
            ← Tillbaka
          </Link>
          <span className="text-[#3a3a38]">/</span>
          <Link href="/" className="inline-flex items-center min-h-[44px] text-xl font-medium">
            <span className="text-[#EF9F27]">sunk</span>
            <span className="text-[#F5C55B]">is</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-medium text-[#F1EFE8] mb-1">Lägg till en bar</h1>
        <p className="text-sm text-[#888780] mb-6">
          Hjälp andra hitta billigt öl — fyll i vad du vet.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grundinfo */}
          <div className="bg-[#2c2c2a] rounded-xl p-4 space-y-4">
            <h2 className="text-sm font-medium text-[#888780] uppercase tracking-wide">Grundinfo</h2>

            <div>
              <label className="block text-sm text-[#888780] mb-1">
                Barens namn <span className="text-[#f87171]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="t.ex. The International Bar"
                className="w-full px-3 py-2.5 bg-[#1a1a18] border border-[#3a3a38] rounded-lg text-[#F1EFE8] placeholder-[#888780] text-sm focus:outline-none focus:border-[#BA7517] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-[#888780] mb-1">Adress</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="t.ex. Folkungagatan 84"
                className="w-full px-3 py-2.5 bg-[#1a1a18] border border-[#3a3a38] rounded-lg text-[#F1EFE8] placeholder-[#888780] text-sm focus:outline-none focus:border-[#BA7517] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-[#888780] mb-1">Stadsdel</label>
              <select
                value={area}
                onChange={e => setArea(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#1a1a18] border border-[#3a3a38] rounded-lg text-[#F1EFE8] text-sm focus:outline-none focus:border-[#BA7517] transition-colors"
              >
                <option value="">Välj stadsdel</option>
                <option value="Södermalm">Södermalm</option>
                <option value="Kungsholmen">Kungsholmen</option>
                <option value="Vasastan">Vasastan</option>
                <option value="Östermalm">Östermalm</option>
                <option value="City">City / Norrmalm</option>
              </select>
            </div>
          </div>

          {/* Priser */}
          <div className="bg-[#2c2c2a] rounded-xl p-4 space-y-4">
            <h2 className="text-sm font-medium text-[#888780] uppercase tracking-wide">Priser</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-[#888780] mb-1">40cl (kr)</label>
                <input
                  type="number"
                  value={price40}
                  onChange={e => setPrice40(e.target.value)}
                  placeholder="t.ex. 35"
                  min="1"
                  max="999"
                  className="w-full px-3 py-2.5 bg-[#1a1a18] border border-[#3a3a38] rounded-lg text-[#F1EFE8] placeholder-[#888780] text-sm focus:outline-none focus:border-[#BA7517] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-[#888780] mb-1">50cl (kr)</label>
                <input
                  type="number"
                  value={price50}
                  onChange={e => setPrice50(e.target.value)}
                  placeholder="t.ex. 45"
                  min="1"
                  max="999"
                  className="w-full px-3 py-2.5 bg-[#1a1a18] border border-[#3a3a38] rounded-lg text-[#F1EFE8] placeholder-[#888780] text-sm focus:outline-none focus:border-[#BA7517] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Happy hour */}
          <div className="bg-[#2c2c2a] rounded-xl p-4 space-y-4">
            <h2 className="text-sm font-medium text-[#888780] uppercase tracking-wide">Happy hour (valfritt)</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-[#888780] mb-1">Happy hour-pris (kr)</label>
                <input
                  type="number"
                  value={hhPrice}
                  onChange={e => setHhPrice(e.target.value)}
                  placeholder="t.ex. 25"
                  min="1"
                  max="999"
                  className="w-full px-3 py-2.5 bg-[#1a1a18] border border-[#3a3a38] rounded-lg text-[#F1EFE8] placeholder-[#888780] text-sm focus:outline-none focus:border-[#BA7517] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-[#888780] mb-1">Storlek</label>
                <select
                  value={hhSize}
                  onChange={e => setHhSize(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1a1a18] border border-[#3a3a38] rounded-lg text-[#F1EFE8] text-sm focus:outline-none focus:border-[#BA7517] transition-colors"
                >
                  <option value="33cl">33 cl</option>
                  <option value="40cl">40 cl</option>
                  <option value="50cl">50 cl</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-[#888780] mb-1">Starttid</label>
                <input
                  type="time"
                  value={hhStart}
                  onChange={e => setHhStart(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1a1a18] border border-[#3a3a38] rounded-lg text-[#F1EFE8] text-sm focus:outline-none focus:border-[#BA7517] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-[#888780] mb-1">Sluttid</label>
                <input
                  type="time"
                  value={hhEnd}
                  onChange={e => setHhEnd(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1a1a18] border border-[#3a3a38] rounded-lg text-[#F1EFE8] text-sm focus:outline-none focus:border-[#BA7517] transition-colors"
                />
              </div>
            </div>

            {/* Dagar för happy hour */}
            <div>
              <label className="block text-sm text-[#888780] mb-2">Dagar</label>
              <div className="flex gap-2 flex-wrap">
                {WEEKDAYS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDay(value)}
                    aria-pressed={hhDays.includes(value)}
                    className={`min-h-[44px] min-w-[44px] px-3 rounded-lg text-sm border transition-colors ${
                      hhDays.includes(value)
                        ? 'bg-[#EF9F27] border-[#EF9F27] text-[#1a1a18]'
                        : 'bg-[#1a1a18] border-[#3a3a38] text-[#888780]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sunkfaktor */}
          <div className="bg-[#2c2c2a] rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-medium text-[#888780] uppercase tracking-wide">Sunkfaktor</h2>
            <p className="text-xs text-[#888780]">Hur sunkigt är det? (1 = ganska trevligt, 5 = riktigt hak)</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSunkFactor(n)}
                  aria-pressed={sunkFactor === n}
                  aria-label={`Sunkfaktor ${n} av 5`}
                  className={`w-11 h-11 rounded-full border-2 transition-all text-sm font-medium ${
                    sunkFactor >= n
                      ? 'bg-[#EF9F27] border-[#EF9F27] text-[#1a1a18]'
                      : 'bg-transparent border-[#3a3a38] text-[#888780]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Felmeddelande */}
          {error && (
            <div className="px-4 py-3 bg-[#f87171]/10 border border-[#f87171]/30 rounded-lg text-sm text-[#f87171]">
              {error}
            </div>
          )}

          {/* Skicka-knapp */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#BA7517] hover:bg-[#EF9F27] text-[#1a1a18] rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Skickar...' : 'Skicka in baren'}
          </button>
        </form>
      </main>
    </div>
  )
}

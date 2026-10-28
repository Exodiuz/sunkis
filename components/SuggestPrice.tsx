// SuggestPrice — "Vad kostar den?" — föreslå pris och storlek för en bar
// Sparas i price_suggestions och granskas av admin innan det visas

'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/deviceId'

type Props = {
  barId: string
  label?: string
}

export default function SuggestPrice({ barId, label = 'Vad kostar en stor stark?' }: Props) {
  const [price, setPrice] = useState('')
  const [size, setSize] = useState('40cl')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = parseInt(price)
    if (!value || value < 1 || value > 999) {
      setError('Skriv ett pris mellan 1 och 999 kr')
      return
    }

    setLoading(true)
    setError('')
    const { error: dbError } = await supabase.from('price_suggestions').insert({
      bar_id: barId,
      price: value,
      size,
      device_id: getDeviceId(),
    })
    setLoading(false)

    if (dbError) {
      console.error('Prisförslag misslyckades:', dbError)
      setError('Något gick fel. Försök igen.')
      return
    }
    setSent(true)
  }

  if (sent) {
    return <p className="text-sm text-[#4ade80]">Tack! Priset granskas innan det visas.</p>
  }

  const inputId = `price-${barId}`
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor={inputId} className="block text-sm text-[#A3A199]">{label}</label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min="1"
          max="999"
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder="kr"
          className="w-24 min-h-[44px] px-3 bg-[#1a1a18] border border-[#3a3a38] rounded-lg text-[#F1EFE8] placeholder-[#A3A199] text-sm focus:border-[#BA7517]"
        />
        <select
          aria-label="Storlek"
          value={size}
          onChange={e => setSize(e.target.value)}
          className="min-h-[44px] px-3 bg-[#1a1a18] border border-[#3a3a38] rounded-lg text-[#F1EFE8] text-sm focus:border-[#BA7517]"
        >
          <option value="33cl">33 cl</option>
          <option value="40cl">40 cl</option>
          <option value="50cl">50 cl</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] px-4 bg-[#BA7517] hover:bg-[#EF9F27] text-[#1a1a18] rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Skickar...' : 'Skicka'}
        </button>
      </div>
      {error && <p className="text-sm text-[#f87171]">{error}</p>}
    </form>
  )
}

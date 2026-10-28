// AddressSearch — adressfält med platsförslag för /submit (C1)
// Söker via /api/geocode medan man skriver; Enter gör en uttrycklig sökning.
// Byggt som en combobox så att skärmläsare och tangentbord fungerar.

'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { GeocodeResult } from '@/lib/geocode'

type Props = {
  value: string
  onChange: (text: string) => void   // fritext — rensar vald plats
  onSelect: (place: GeocodeResult) => void
  selected: GeocodeResult | null
}

const DEBOUNCE_MS = 350

export default function AddressSearch({ value, onChange, onSelect, selected }: Props) {
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const listId = useId()
  const inputId = useId()
  const requestRef = useRef(0)

  async function search(q: string, explicit = false) {
    const id = ++requestRef.current
    setStatus('loading')
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}${explicit ? '&explicit=1' : ''}`)
      const json = await res.json()
      if (id !== requestRef.current) return // ett nyare anrop har tagit över
      setResults(json.results ?? [])
      setStatus(res.ok ? 'idle' : 'error')
      setOpen(true)
      setActive(-1)
    } catch {
      if (id === requestRef.current) setStatus('error')
    }
  }

  // Sök medan man skriver, med fördröjning — inte när en plats just valts
  useEffect(() => {
    const q = value.trim()
    if (selected || q.length < 3) {
      setResults([])
      setOpen(false)
      return
    }
    const timer = setTimeout(() => search(q), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [value, selected])

  function choose(place: GeocodeResult) {
    onSelect(place)
    setOpen(false)
    setResults([])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault()
      setOpen(true)
      setActive(i => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault()
      setActive(i => (i <= 0 ? results.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault() // skicka inte formuläret
      if (open && active >= 0) choose(results[active])
      else if (value.trim().length >= 3) search(value.trim(), true)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <label htmlFor={inputId} className="block text-sm text-[#A3A199] mb-1">Adress</label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Sök adress eller barens namn"
        className="w-full px-3 py-2.5 bg-[#1a1a18] border border-[#3a3a38] rounded-lg text-[#F1EFE8] placeholder-[#A3A199] text-sm focus:border-[#BA7517] transition-colors"
      />

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-[#3a3a38] bg-[#2c2c2a] shadow-lg"
        >
          {results.map((place, i) => (
            <li
              key={`${place.osmId ?? place.label}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={e => { e.preventDefault(); choose(place) }}
              className={`flex items-center min-h-[44px] px-3 py-2 text-sm cursor-pointer ${
                i === active ? 'bg-[#3a3a38] text-[#F1EFE8]' : 'text-[#F1EFE8] hover:bg-[#3a3a38]'
              }`}
            >
              {place.label}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-1 text-sm text-[#A3A199]" role="status">
        {selected
          ? '✓ Plats vald – baren hamnar rätt på kartan.'
          : status === 'loading'
            ? 'Söker…'
            : status === 'error'
              ? 'Adressökningen svarar inte just nu. Skriv adressen så placerar vi baren åt dig.'
              : open && results.length === 0
                ? 'Inga träffar i Stockholm. Prova gatunamn och nummer.'
                : 'Välj ett förslag så hamnar baren rätt på kartan.'}
      </p>
    </div>
  )
}

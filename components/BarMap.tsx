// BarMap — MapLibre GL-karta med pins för alla barer
// Kartbild från OpenFreeMap (vektor, ingen API-nyckel), se docs/kartval.md
// Laddas med next/dynamic och ssr: false eftersom MapLibre kräver window

'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Bar } from '@/lib/supabase'
import { getCurrentPrice, getComparablePrice, formatSize } from '@/lib/happyHour'

// Mörk stil som matchar appens tema
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark'
const STOCKHOLM: [number, number] = [18.0686, 59.3293] // lng, lat

type Props = {
  bars: Bar[]
}

// Väljer pin-färg baserat på pris per 40 cl
function getPinColor(bar: Bar): string {
  const price = getComparablePrice(bar)
  if (!price) return '#A3A199'      // grå = pris saknas
  if (price < 35) return '#4ade80'  // grön = under 35 kr
  if (price <= 55) return '#facc15' // gul = 35–55 kr
  return '#f87171'                  // röd = över 55 kr
}

// Escapar text som stoppas in i popupens HTML — namn kommer från anonyma inskick
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string
  ))
}

// Skapar en SVG-pin-ikon med given färg
function createPinIcon(color: string): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36" aria-hidden="true">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22s14-12.67 14-22C28 6.27 21.73 0 14 0z"
        fill="${color}" stroke="#1a1a18" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="6" fill="#1a1a18" opacity="0.5"/>
    </svg>
  `
}

// Popup-innehåll med bar-info
function createPopupHtml(bar: Bar): string {
  const { price, size, isHappyHour } = getCurrentPrice(bar)
  return `
    <div style="font-family: var(--font-inter), sans-serif; min-width: 160px;">
      <strong style="color: #F1EFE8; font-size: 14px;">${escapeHtml(bar.name)}</strong>
      ${bar.area ? `<div style="color: #A3A199; font-size: 14px; margin-top: 2px;">${escapeHtml(bar.area)}</div>` : ''}
      <div style="margin-top: 8px;">
        ${price
          ? `<span style="color: ${isHappyHour ? '#4ade80' : '#EF9F27'}; font-size: 20px; font-weight: 500;">${price} kr</span>
             <span style="color: #A3A199; font-size: 14px;"> · ${formatSize(size)}</span>`
          : '<span style="color: #A3A199; font-size: 14px; font-style: italic;">Pris saknas</span>'
        }
        ${isHappyHour ? '<div style="color: #4ade80; font-size: 14px; margin-top: 2px;">Happy hour just nu!</div>' : ''}
      </div>
      <a href="/bar/${encodeURIComponent(bar.id)}"
         style="display: inline-flex; align-items: center; min-height: 44px; color: #EF9F27; font-size: 14px; text-decoration: underline;">
        Visa detaljer →
      </a>
    </div>
  `
}

export default function BarMap({ bars }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

  // Skapa kartan en gång
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: STOCKHOLM,
      zoom: 13,
      attributionControl: { compact: false },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    // Städa upp kartan när komponenten avmonteras
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Rita om pins när barerna ändras (t.ex. nya filter) utan att bygga om kartan
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = bars
      .filter(bar => bar.lat !== null && bar.lng !== null)
      .map(bar => {
        const { price, size } = getCurrentPrice(bar)

        // Pinnen är en knapp med 44 × 44 px träffyta och tillgängligt namn
        const el = document.createElement('button')
        el.type = 'button'
        el.className = 'sunkis-pin'
        el.setAttribute('aria-label', price ? `${bar.name}, ${price} kr för ${formatSize(size)}` : `${bar.name}, pris saknas`)
        el.innerHTML = createPinIcon(getPinColor(bar))

        return new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([bar.lng as number, bar.lat as number])
          .setPopup(new maplibregl.Popup({ offset: 40, closeButton: true }).setHTML(createPopupHtml(bar)))
          .addTo(map)
      })
  }, [bars])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Förklaring av pin-färger */}
      <div className="absolute bottom-10 left-4 z-10 bg-[#2c2c2a]/90 backdrop-blur-sm rounded-lg p-3 text-sm space-y-1.5 border border-[#3a3a38]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#4ade80]" /> Under 35 kr
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#facc15]" /> 35–55 kr
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#f87171]" /> Över 55 kr
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#A3A199]" /> Pris saknas
        </div>
      </div>
    </div>
  )
}

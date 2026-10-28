// BarMap — Leaflet.js-karta med pins för alla barer
// Laddas dynamiskt med 'use client' och 'dynamic' för att undvika SSR-fel

'use client'

import { useEffect, useRef } from 'react'
import type { Bar } from '@/lib/supabase'
import { getCurrentPrice, getComparablePrice, formatSize } from '@/lib/happyHour'

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
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22s14-12.67 14-22C28 6.27 21.73 0 14 0z"
        fill="${color}" stroke="#1a1a18" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="6" fill="#1a1a18" opacity="0.5"/>
    </svg>
  `
}

export default function BarMap({ bars }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  // Håller referens till Leaflet-instansen för att undvika dubbel-init
  const leafletRef = useRef<unknown>(null)

  useEffect(() => {
    // Leaflet måste laddas client-side (fönster-objekt behövs)
    if (typeof window === 'undefined') return
    if (leafletRef.current) return // redan initierad

    // Dynamisk import av Leaflet
    import('leaflet').then((L) => {
      if (!mapRef.current) return
      if ((mapRef.current as HTMLElement & { _leaflet_id?: number })._leaflet_id) return

      // Fixa Leaflet-ikonernas sökvägar (Next.js-problem)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Initiera kartan centrerad på Stockholm
      const map = L.map(mapRef.current, {
        center: [59.3293, 18.0686],
        zoom: 13,
        zoomControl: true,
      })

      // OpenStreetMap-tiles (gratis, ingen API-nyckel)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Lägg till pins för varje bar
      bars.forEach((bar) => {
        if (!bar.lat || !bar.lng) return

        const color = getPinColor(bar)
        const { price, size, isHappyHour } = getCurrentPrice(bar)

        // Anpassad SVG-ikon i en träffyta på 44 × 44 px
        const icon = L.divIcon({
          html: `<span style="display:flex;align-items:flex-end;justify-content:center;width:44px;height:44px;">${createPinIcon(color)}</span>`,
          iconSize: [44, 44],
          iconAnchor: [22, 44],
          popupAnchor: [0, -40],
          className: '', // töm klassen för att undvika Leaflet-standard-bakgrund
        })

        // Popup-innehåll med bar-info
        const popupContent = `
          <div style="font-family: Inter, sans-serif; min-width: 160px;">
            <strong style="color: #F1EFE8; font-size: 14px;">${escapeHtml(bar.name)}</strong>
            ${bar.area ? `<div style="color: #A3A199; font-size: 12px; margin-top: 2px;">${escapeHtml(bar.area)}</div>` : ''}
            <div style="margin-top: 8px;">
              ${price
                ? `<span style="color: ${isHappyHour ? '#4ade80' : '#EF9F27'}; font-size: 20px; font-weight: 500;">${price} kr</span>
                   <span style="color: #A3A199; font-size: 12px;"> · ${formatSize(size)}</span>`
                : '<span style="color: #A3A199; font-size: 13px; font-style: italic;">Pris saknas</span>'
              }
              ${isHappyHour ? '<div style="color: #4ade80; font-size: 12px; margin-top: 2px;">⚡ Happy hour just nu!</div>' : ''}
            </div>
            <a href="/bar/${encodeURIComponent(bar.id)}"
               style="display: inline-block; margin-top: 8px; color: #EF9F27; font-size: 12px; text-decoration: underline;">
              Visa detaljer →
            </a>
          </div>
        `

        // title ger nålen ett tillgängligt namn för skärmläsare
        const label = price ? `${bar.name}, ${price} kr för ${formatSize(size)}` : `${bar.name}, pris saknas`
        L.marker([bar.lat, bar.lng], { icon, title: label, alt: label, keyboard: true })
          .addTo(map)
          .bindPopup(popupContent)
      })

      leafletRef.current = map
    })

    // Städa upp kartan när komponenten avmonteras
    return () => {
      if (leafletRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(leafletRef.current as any).remove()
        leafletRef.current = null
      }
    }
  }, [bars])

  return (
    <div className="relative w-full h-full">
      {/* Leaflet CSS — laddas inline för att undvika SSR-problem */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div ref={mapRef} className="w-full h-full rounded-xl" />

      {/* Förklaring av pin-färger */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-[#2c2c2a]/90 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1.5 border border-[#3a3a38]">
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

// BarMap — MapLibre GL-karta med pins för alla barer
// Kartbild från OpenFreeMap (vektor, ingen API-nyckel), se docs/kartval.md
// Laddas med next/dynamic och ssr: false eftersom MapLibre kräver window

'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Zap } from 'lucide-react'
import type { Bar } from '@/lib/supabase'
import type { LatLng } from '@/lib/geo'
import { getCurrentPrice, getComparablePrice, formatSize } from '@/lib/happyHour'

// Mörk stil som matchar appens tema
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark'
const STOCKHOLM: [number, number] = [18.0686, 59.3293] // lng, lat

type Props = {
  bars: Bar[]
  userPosition?: LatLng | null // blå prick (K3)
  centerRequest?: number       // ökas för att centrera kartan på userPosition
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

// Blixt (lucide Zap) som markerar happy hour i prisnålen
const ZAP_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
  '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>'

// Prisnål "25 kr" i prisets färg, med blixt under happy hour (K2)
function createPricePin(bar: Bar): HTMLButtonElement {
  const { price, size, isHappyHour } = getCurrentPrice(bar)
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'sunkis-price-pin'
  el.setAttribute(
    'aria-label',
    price
      ? `${bar.name}, ${price} kr för ${formatSize(size)}${isHappyHour ? ', happy hour just nu' : ''}`
      : `${bar.name}, pris saknas`,
  )
  el.innerHTML = `<span class="sunkis-price-pin__label" style="background:${getPinColor(bar)}">${
    isHappyHour ? ZAP_SVG : ''
  }${price ? `${price} kr` : '–'}</span>`
  return el
}

// GeoJSON för klustringen — bara id behövs, resten slås upp i barsById
function toGeoJSON(bars: Bar[]): GeoJSON.FeatureCollection<GeoJSON.Point, { id: string }> {
  return {
    type: 'FeatureCollection',
    features: bars
      .filter(bar => bar.lat !== null && bar.lng !== null)
      .map(bar => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [bar.lng as number, bar.lat as number] },
        properties: { id: bar.id },
      })),
  }
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

export default function BarMap({ bars, userPosition = null, centerRequest = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  // Prisnålar för oklustrade barer, nycklade på bar-id
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  const barsByIdRef = useRef<Map<string, Bar>>(new Map())
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)

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
    const markers = markersRef.current

    // Visa prisnålar för de barer som inte ingår i ett kluster just nu
    function syncMarkers() {
      if (!map.getSource('bars') || !map.isSourceLoaded('bars')) return
      const visible = new Set<string>()
      for (const feature of map.querySourceFeatures('bars')) {
        const props = feature.properties as { id?: string; cluster?: boolean }
        if (props.cluster || !props.id) continue
        visible.add(props.id)
        if (markers.has(props.id)) continue
        const bar = barsByIdRef.current.get(props.id)
        if (!bar) continue
        markers.set(
          props.id,
          new maplibregl.Marker({ element: createPricePin(bar), anchor: 'center' })
            .setLngLat([bar.lng as number, bar.lat as number])
            .setPopup(new maplibregl.Popup({ offset: 24, closeButton: true }).setHTML(createPopupHtml(bar)))
            .addTo(map),
        )
      }
      markers.forEach((marker, id) => {
        if (!visible.has(id)) {
          marker.remove()
          markers.delete(id)
        }
      })
    }

    map.on('load', () => {
      map.addSource('bars', {
        type: 'geojson',
        data: toGeoJSON(Array.from(barsByIdRef.current.values())),
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 15,
      })
      // Kluster: cirkel med antal barer (K2)
      map.addLayer({
        id: 'bar-clusters',
        type: 'circle',
        source: 'bars',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#EF9F27',
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 30],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#1a1a18',
        },
      })
      map.addLayer({
        id: 'bar-cluster-count',
        type: 'symbol',
        source: 'bars',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 14,
        },
        paint: { 'text-color': '#1a1a18' },
      })

      // Tryck på kluster zoomar in tills det delar upp sig
      map.on('click', 'bar-clusters', async event => {
        const feature = event.features?.[0]
        if (!feature) return
        const source = map.getSource('bars') as maplibregl.GeoJSONSource
        const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id)
        map.easeTo({ center: (feature.geometry as GeoJSON.Point).coordinates as [number, number], zoom })
      })
      map.on('mouseenter', 'bar-clusters', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'bar-clusters', () => { map.getCanvas().style.cursor = '' })
    })
    map.on('render', syncMarkers)

    // Städa upp kartan när komponenten avmonteras
    return () => {
      markers.forEach(marker => marker.remove())
      markers.clear()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Uppdatera källan när barerna ändras (t.ex. nya filter) utan att bygga om kartan
  useEffect(() => {
    barsByIdRef.current = new Map(bars.map(bar => [bar.id, bar]))
    // Nålar byggs om med aktuellt pris och happy hour-status
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current.clear()
    const source = mapRef.current?.getSource('bars') as maplibregl.GeoJSONSource | undefined
    source?.setData(toGeoJSON(bars))
  }, [bars])

  // Användarens position som blå prick (K3)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!userPosition) {
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      return
    }
    if (!userMarkerRef.current) {
      const dot = document.createElement('div')
      dot.className = 'sunkis-user-dot'
      dot.setAttribute('role', 'img')
      dot.setAttribute('aria-label', 'Din position')
      userMarkerRef.current = new maplibregl.Marker({ element: dot }).addTo(map)
    }
    userMarkerRef.current.setLngLat([userPosition.lng, userPosition.lat])
  }, [userPosition])

  // Centrera på användaren när knappen trycks och positionen finns
  useEffect(() => {
    if (!centerRequest || !userPosition || !mapRef.current) return
    mapRef.current.easeTo({
      center: [userPosition.lng, userPosition.lat],
      zoom: Math.max(mapRef.current.getZoom(), 15),
    })
  }, [centerRequest, userPosition])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Förklaring av nålarna */}
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
          <Zap aria-hidden="true" className="w-3.5 h-3.5 text-[#F1EFE8]" /> Happy hour nu
        </div>
      </div>
    </div>
  )
}

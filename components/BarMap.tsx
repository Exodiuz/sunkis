// BarMap — MapLibre GL-karta med prisnålar för alla barer
// Kartbild från OpenFreeMap (vektor, ingen API-nyckel), se docs/kartval.md
// Laddas med next/dynamic och ssr: false eftersom MapLibre kräver window
//
// Barerna ritas som GL-lager, inte HTML-markörer: prisnålar där det får plats
// (billigast vinner när de krockar), färgade prickar för resten och grå prickar
// för barer som saknar pris. Kortet och listan för vald bar ligger i MapClient.

'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { colors } from '@/lib/theme'
import type { LatLng } from '@/lib/geo'
import { DARK_MAP_BACKGROUND, MAP_STYLES, mapThemeFromDocument, type MapTheme } from '@/lib/mapStyle'
import { parsePinImageId, toFeatureCollection, type Bounds, type MapBar } from '@/lib/mapBars'
import { drawPin, TIER_COLORS } from '@/lib/mapPins'

const STOCKHOLM: [number, number] = [18.0686, 59.3293] // lng, lat
// Storstockholm — kartan går inte att dra iväg till resten av världen
const MAX_BOUNDS: [[number, number], [number, number]] = [[17.4, 59.0], [18.8, 59.7]]
const LOAD_TIMEOUT_MS = 15_000
const HIT_RADIUS = 14 // px runt trycket, så att små prickar går att träffa med fingret
// Översta lagret först — det som syns överst vinner trycket
const HIT_LAYERS = ['bars-selected', 'bars-pins', 'bars-dots', 'bars-unpriced'] as const

export type MapStatus = 'loading' | 'ready' | 'error'

type Props = {
  bars: MapBar[]
  now: Date
  selectedId: string | null
  onSelect: (id: string | null) => void
  onViewChange: (bounds: Bounds) => void
  onStatusChange: (status: MapStatus) => void
  focus: { id: string; seq: number } | null // flyg till en bar (från listan eller ?bar=)
  bottomInset: number                         // px som kortet täcker längst ner
  showUnpriced: boolean
  userPosition?: LatLng | null                // blå prick (K3)
  centerRequest?: number                      // ökas för att centrera kartan på userPosition
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function boundsOf(map: maplibregl.Map): Bounds {
  const b = map.getBounds()
  return { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() }
}

function selectedFilter(id: string | null): maplibregl.FilterSpecification {
  return ['==', ['get', 'id'], id ?? '']
}

export default function BarMap({
  bars,
  now,
  selectedId,
  onSelect,
  onViewChange,
  onStatusChange,
  focus,
  bottomInset,
  showUnpriced,
  userPosition = null,
  centerRequest = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)

  // Senaste värden för händelsehanterarna, som bara registreras en gång
  const latest = useRef({ bars, now, selectedId, showUnpriced, bottomInset, onSelect, onViewChange, onStatusChange })
  latest.current = { bars, now, selectedId, showUnpriced, bottomInset, onSelect, onViewChange, onStatusChange }
  const pendingFocus = useRef<{ id: string; seq: number } | null>(null)
  const flyToBarRef = useRef<((id: string, instant?: boolean) => void) | null>(null)
  const readyRef = useRef(false)

  // Skapa kartan en gång
  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    let map: maplibregl.Map
    let theme: MapTheme = mapThemeFromDocument(document.documentElement)
    try {
      map = new maplibregl.Map({
        container,
        style: MAP_STYLES[theme],
        center: STOCKHOLM,
        zoom: 13,
        minZoom: 9,
        maxBounds: MAX_BOUNDS,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: false, // läggs uppe till höger, nere skyms den av kortet
      })
    } catch (error) {
      // Oftast saknat WebGL-stöd
      console.error('Kartan kunde inte startas:', error)
      latest.current.onStatusChange('error')
      return
    }
    map.touchZoomRotate.disableRotation()
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-right')
    map.getCanvas().setAttribute('aria-label', 'Karta över barer. Listan över barer i vyn finns bredvid kartan.')
    mapRef.current = map

    // Prisnålarnas typsnitt — samma som priserna i resten av appen
    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim()
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 3)

    let loaded = false
    const timeout = window.setTimeout(() => {
      if (!loaded) latest.current.onStatusChange('error')
    }, LOAD_TIMEOUT_MS)

    // Nålar ritas när kartan ber om dem — bild-id:t beskriver hela utseendet
    map.on('styleimagemissing', event => {
      const style = parsePinImageId(event.id)
      if (!style || map.hasImage(event.id)) return
      const image = drawPin(style, fontFamily, pixelRatio)
      if (image) map.addImage(event.id, image, { pixelRatio })
    })

    // Källa och lager läggs till vid varje stilladdning, så att de finns kvar
    // om stilen byts när temat ändras
    function addBarLayers() {
      const { bars, now, selectedId, showUnpriced } = latest.current
      if (theme === 'dark' && map.getLayer('background')) {
        map.setPaintProperty('background', 'background-color', DARK_MAP_BACKGROUND)
      }
      map.addSource('bars', { type: 'geojson', data: toFeatureCollection(bars, now) })

      // Barer utan pris: små grå prickar
      map.addLayer({
        id: 'bars-unpriced',
        type: 'circle',
        source: 'bars',
        filter: ['!', ['get', 'priced']],
        layout: { visibility: showUnpriced ? 'visible' : 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 14, 4, 17, 6.5],
          'circle-color': colors.muted,
          'circle-opacity': 0.7,
          'circle-stroke-width': 1,
          'circle-stroke-color': colors.ink,
        },
      })
      // Barer med pris: prick i prisets färg — syns även när nålen inte får plats
      map.addLayer({
        id: 'bars-dots',
        type: 'circle',
        source: 'bars',
        filter: ['get', 'priced'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 14, 6, 17, 8],
          'circle-color': [
            'match', ['get', 'tier'],
            'cheap', TIER_COLORS.cheap,
            'mid', TIER_COLORS.mid,
            'pricey', TIER_COLORS.pricey,
            colors.muted,
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': colors.ink,
        },
      })
      // Prisnålar: krockar löses så att billigast syns
      map.addLayer({
        id: 'bars-pins',
        type: 'symbol',
        source: 'bars',
        filter: ['get', 'priced'],
        minzoom: 11,
        layout: {
          'icon-image': ['get', 'pin'],
          'icon-allow-overlap': false,
          'icon-padding': 2,
          'symbol-sort-key': ['get', 'sort'],
        },
      })
      // Vald bar överst, alltid synlig
      map.addLayer({
        id: 'bars-selected',
        type: 'symbol',
        source: 'bars',
        filter: selectedFilter(selectedId),
        layout: {
          'icon-image': ['get', 'pinSelected'],
          'icon-allow-overlap': true,
        },
      })
    }

    map.on('style.load', addBarLayers)

    map.on('load', () => {
      loaded = true
      readyRef.current = true
      window.clearTimeout(timeout)
      latest.current.onStatusChange('ready')
      latest.current.onViewChange(boundsOf(map))
      if (pendingFocus.current) flyToBar(pendingFocus.current.id, true)
      pendingFocus.current = null
    })

    // Fel innan kartan laddats betyder att stilen eller kartbilden inte gick att hämta
    map.on('error', event => {
      console.error('Kartfel:', event.error)
      if (!loaded) latest.current.onStatusChange('error')
    })

    map.on('moveend', () => latest.current.onViewChange(boundsOf(map)))

    // Närmaste bar inom fingerbredd från trycket
    function barAt(point: maplibregl.Point, radius: number): string | null {
      const box: [maplibregl.PointLike, maplibregl.PointLike] = [
        [point.x - radius, point.y - radius],
        [point.x + radius, point.y + radius],
      ]
      for (const layer of HIT_LAYERS) {
        if (!map.getLayer(layer) || map.getLayoutProperty(layer, 'visibility') === 'none') continue
        const hits = map.queryRenderedFeatures(box, { layers: [layer] })
        if (hits.length === 0) continue
        let best = hits[0]
        let bestDist = Infinity
        for (const hit of hits) {
          const [lng, lat] = (hit.geometry as GeoJSON.Point).coordinates
          const p = map.project([lng, lat])
          const d = (p.x - point.x) ** 2 + (p.y - point.y) ** 2
          if (d < bestDist) { best = hit; bestDist = d }
        }
        return (best.properties as { id?: string }).id ?? null
      }
      return null
    }

    map.on('click', event => latest.current.onSelect(barAt(event.point, HIT_RADIUS)))
    map.on('mousemove', event => {
      map.getCanvas().style.cursor = barAt(event.point, 6) ? 'pointer' : ''
    })

    // Flyg till en bar så att den hamnar ovanför kortet
    function flyToBar(id: string, instant = false) {
      const bar = latest.current.bars.find(b => b.id === id)
      if (!bar || bar.lat === null || bar.lng === null) return
      const target: [number, number] = [bar.lng, bar.lat]
      const padding = { top: 40, right: 40, left: 40, bottom: latest.current.bottomInset + 40 }
      const point = map.project(target)
      const canvas = map.getCanvas()
      const inView =
        point.x > padding.left && point.x < canvas.clientWidth - padding.right &&
        point.y > padding.top && point.y < canvas.clientHeight - padding.bottom
      if (inView && map.getZoom() >= 14) return
      const options = { center: target, zoom: Math.max(map.getZoom(), 15), padding }
      if (instant || prefersReducedMotion()) map.jumpTo(options)
      else map.easeTo({ ...options, duration: 600 })
    }
    flyToBarRef.current = flyToBar

    // Byt stil om html-elementets tema ändras
    const observer = new MutationObserver(() => {
      const next = mapThemeFromDocument(document.documentElement)
      if (next === theme) return
      theme = next
      map.setStyle(MAP_STYLES[theme], { diff: false })
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    // Städa upp kartan när komponenten avmonteras
    return () => {
      window.clearTimeout(timeout)
      observer.disconnect()
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      map.remove()
      mapRef.current = null
      readyRef.current = false
      flyToBarRef.current = null
    }
  }, [])

  // Uppdatera källan när barerna, filtren eller klockan (happy hour) ändras
  useEffect(() => {
    const source = mapRef.current?.getSource('bars') as maplibregl.GeoJSONSource | undefined
    source?.setData(toFeatureCollection(bars, now))
  }, [bars, now])

  // Markera vald bar
  useEffect(() => {
    const map = mapRef.current
    if (map?.getLayer('bars-selected')) map.setFilter('bars-selected', selectedFilter(selectedId))
  }, [selectedId])

  // Visa eller dölj barer utan pris
  useEffect(() => {
    const map = mapRef.current
    if (map?.getLayer('bars-unpriced')) {
      map.setLayoutProperty('bars-unpriced', 'visibility', showUnpriced ? 'visible' : 'none')
    }
  }, [showUnpriced])

  // Flyg till en bar på begäran — väntar tills kartan laddats
  useEffect(() => {
    if (!focus) return
    if (readyRef.current && flyToBarRef.current) flyToBarRef.current(focus.id)
    else pendingFocus.current = focus
  }, [focus])

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
    const map = mapRef.current
    if (!centerRequest || !userPosition || !map) return
    const options = {
      center: [userPosition.lng, userPosition.lat] as [number, number],
      zoom: Math.max(map.getZoom(), 15),
      padding: { top: 40, right: 40, left: 40, bottom: latest.current.bottomInset + 40 },
    }
    if (prefersReducedMotion()) map.jumpTo(options)
    else map.easeTo(options)
  }, [centerRequest, userPosition])

  return <div ref={containerRef} className="w-full h-full" />
}

// MapClient — kartsidans klientdel
// Samma URL-filter som listan (K1). Kartan visar alla granskade barer; vald bar
// visas i ett kort och sparas i ?bar= så att länken går att dela. Barerna i
// vyn finns också som lista — i en panel på stor skärm, i ett utdrag på mobil.

'use client'

import { ChevronDown, ChevronUp, RotateCw, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { applyFilters, hasActiveFilters } from '@/lib/filters'
import { distinctAreas } from '@/lib/areas'
import { distanceToBar } from '@/lib/geo'
import { getComparablePrice, getCurrentPrice } from '@/lib/happyHour'
import { barsInView, type Bounds, type MapBar } from '@/lib/mapBars'
import { TIER_COLORS } from '@/lib/mapPins'
import { useNow } from '@/lib/useNow'
import { useUrlFilters } from '@/lib/useUrlFilters'
import { useUserLocation } from '@/lib/useUserLocation'
import FilterPills from '@/components/FilterPills'
import MapBarCard from '@/components/MapBarCard'
import MapBarList from '@/components/MapBarList'
import type { MapStatus } from '@/components/BarMap'

// Ladda kartan dynamiskt (inget SSR — MapLibre kräver window-objekt)
const BarMap = dynamic(() => import('@/components/BarMap'), { ssr: false })

type Props = {
  bars: MapBar[]
  renderedAt: number
}

// Läser och skriver ?bar= utan att röra filtren
function readBarParam(): string | null {
  return new URLSearchParams(window.location.search).get('bar')
}
function writeBarParam(id: string | null) {
  const params = new URLSearchParams(window.location.search)
  if (id) params.set('bar', id)
  else params.delete('bar')
  const qs = params.toString()
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
}

const LEGEND = [
  { color: TIER_COLORS.cheap, label: 'Under 35 kr' },
  { color: TIER_COLORS.mid, label: '35–55 kr' },
  { color: TIER_COLORS.pricey, label: 'Över 55 kr' },
] as const

export default function MapClient({ bars, renderedAt }: Props) {
  const now = useNow(renderedAt)
  const { filters, setFilters, resetFilters } = useUrlFilters()
  const areas = useMemo(() => distinctAreas(bars.map(b => b.area)), [bars])

  const [showUnpriced, setShowUnpriced] = useState(true)
  const filtered = useMemo(() => {
    const result = applyFilters(bars, filters, now)
    return showUnpriced ? result : result.filter(bar => getCurrentPrice(bar, now).price !== null)
  }, [bars, filters, now, showUnpriced])
  const active = hasActiveFilters(filters)

  // Vald bar och kartans läge
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ id: string; seq: number } | null>(null)
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [status, setStatus] = useState<MapStatus>('loading')
  const [mapKey, setMapKey] = useState(0)
  const [listOpen, setListOpen] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)

  const select = useCallback((id: string | null, fly = false) => {
    setSelectedId(id)
    writeBarParam(id)
    if (id && fly) setFocus(prev => ({ id, seq: (prev?.seq ?? 0) + 1 }))
  }, [])

  // Delad länk: /map?bar=<id> öppnar kortet och flyger dit
  useEffect(() => {
    const id = readBarParam()
    if (id && bars.some(b => b.id === id)) select(id, true)
  }, [bars, select])

  // Vald bar som filtrerats bort stängs
  const selectedBar = useMemo(() => filtered.find(b => b.id === selectedId) ?? null, [filtered, selectedId])
  useEffect(() => {
    if (selectedId && !selectedBar) select(null)
  }, [selectedId, selectedBar, select])

  // Egen position (K3) — frågar först när användaren trycker på knappen
  const location = useUserLocation()
  const [centerRequest, setCenterRequest] = useState(0)
  const [wantsCenter, setWantsCenter] = useState(false)

  function centerOnMe() {
    if (location.position) setCenterRequest(n => n + 1)
    else {
      setWantsCenter(true)
      location.request()
    }
  }

  // Centrera så fort positionen kommer om användaren bad om det
  useEffect(() => {
    if (wantsCenter && location.position) {
      setCenterRequest(n => n + 1)
      setWantsCenter(false)
    }
  }, [wantsCenter, location.position])

  const distances = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const bar of filtered) map.set(bar.id, distanceToBar(location.position, bar))
    return map
  }, [filtered, location.position])

  // Barerna i vyn, billigast först
  const inView = useMemo(() => barsInView(filtered, bounds, now), [filtered, bounds, now])
  const cheapest = inView.length > 0 ? getComparablePrice(inView[0], now) : null
  const cheapestPrice = inView.length > 0 && cheapest !== null ? getCurrentPrice(inView[0], now).price : null

  // Kortets höjd längst ner, så att kartan centrerar ovanför det
  const sheetRef = useRef<HTMLDivElement>(null)
  const [bottomInset, setBottomInset] = useState(0)
  useEffect(() => {
    const el = sheetRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setBottomInset(el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function pickFromList(id: string) {
    setListOpen(false)
    select(id, true)
  }

  function retry() {
    setStatus('loading')
    setMapKey(k => k + 1)
  }

  const listSummary = `${inView.length} ${inView.length === 1 ? 'bar' : 'barer'} här`

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] bg-ink">
      {/* Header med samma filter som listan */}
      <header className="flex-shrink-0 bg-ink/95 backdrop-blur-sm border-b border-surface z-10">
        <div className="max-w-screen-2xl mx-auto px-4 pt-1">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center min-h-[44px] text-xl font-display font-bold">
              <span className="text-brand">sunk</span>
              <span className="text-teal">is</span>
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted" aria-live="polite">
                {active ? `${filtered.length} av ${bars.length} barer` : `${bars.length} barer`}
              </span>
              {active && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="min-h-[44px] px-2 -mr-2 text-brand-light hover:text-teal"
                >
                  Rensa <X aria-hidden="true" className="inline w-4 h-4 -mt-0.5" />
                </button>
              )}
            </div>
          </div>
          <FilterPills filters={filters} areas={areas} onChange={setFilters} />
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Lista över barer i vyn — panel på stor skärm */}
        <aside aria-label="Barer i kartvyn" className="hidden lg:flex flex-col w-96 flex-shrink-0 border-r border-surface bg-surface">
          <p className="px-4 py-3 text-sm text-muted border-b border-line">
            <span className="text-cream font-medium">{listSummary}</span>
            {cheapestPrice !== null && <> · billigast {cheapestPrice} kr</>}
          </p>
          <div className="flex-1 overflow-y-auto">
            <MapBarList bars={inView} now={now} selectedId={selectedId} distances={distances} onPick={id => select(id, true)} />
          </div>
        </aside>

        {/* Kartan */}
        <div className="relative flex-1 min-w-0">
          <BarMap
            key={mapKey}
            bars={filtered}
            now={now}
            selectedId={selectedId}
            onSelect={select}
            onViewChange={setBounds}
            onStatusChange={setStatus}
            focus={focus}
            bottomInset={bottomInset}
            showUnpriced={showUnpriced}
            userPosition={location.position}
            centerRequest={centerRequest}
          />

          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink pointer-events-none">
              <p className="text-muted text-sm animate-pulse">Laddar karta…</p>
            </div>
          )}

          {status === 'error' && (
            // Överst, så att listan längst ner inte skymmer den
            <div className="absolute inset-0 z-10 flex items-start justify-center bg-ink px-6 pt-20">
              <div role="alert" className="max-w-xs text-center space-y-3">
                <p className="text-cream font-medium">Kartan kunde inte laddas</p>
                <p className="text-sm text-muted">Kontrollera anslutningen. Barerna finns i listan under tiden.</p>
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-brand text-ink text-sm font-medium hover:bg-brand-light"
                >
                  <RotateCw aria-hidden="true" className="w-4 h-4" />
                  Försök igen
                </button>
              </div>
            </div>
          )}

          {/* Förklaring av färgerna och val för barer utan pris */}
          <div className="absolute left-3 top-3 z-10">
            <button
              type="button"
              aria-expanded={legendOpen}
              aria-controls="map-legend"
              onClick={() => setLegendOpen(open => !open)}
              className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-full bg-surface/95 border border-line text-sm text-cream shadow-lg hover:border-brand"
            >
              <span aria-hidden="true" className="flex -space-x-1">
                {LEGEND.map(item => (
                  <span key={item.label} className="w-3 h-3 rounded-full ring-2 ring-surface" style={{ background: item.color }} />
                ))}
              </span>
              Förklaring
            </button>
            {legendOpen && (
              <div id="map-legend" className="mt-2 w-60 bg-surface/95 backdrop-blur-sm border border-line rounded-xl p-3 text-sm space-y-2 shadow-lg">
                <p className="text-muted">Pris per 40 cl just nu</p>
                {LEGEND.map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-ink" style={{ background: item.color }} />
                    {item.label}
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-brand bg-success" />
                  Rosa ring = happy hour nu
                </div>
                <label className="flex items-center gap-2 min-h-[44px] pt-1 border-t border-line cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUnpriced}
                    onChange={e => setShowUnpriced(e.target.checked)}
                    className="w-5 h-5 accent-brand"
                  />
                  <span className="w-3 h-3 rounded-full bg-muted" aria-hidden="true" />
                  Visa barer utan pris
                </label>
              </div>
            )}
          </div>

          {/* Kort och mobil-lista längst ner */}
          <div ref={sheetRef} className="absolute inset-x-0 bottom-0 z-10 p-2 sm:p-3 pointer-events-none">
            {/* Centrera på mig — i tumzonen ovanför kortet */}
            <div className={`flex flex-col items-end gap-2 mb-2 ${status === 'error' ? 'hidden' : ''}`}>
              {(location.status === 'denied' || location.status === 'unavailable') && (
                <p role="status" className="pointer-events-auto max-w-[220px] text-right text-sm bg-surface/95 border border-line rounded-lg px-3 py-2 text-muted">
                  {location.status === 'denied' ? 'Platsåtkomst är avstängd.' : 'Kunde inte hitta din position.'}
                </p>
              )}
              <button
                type="button"
                onClick={centerOnMe}
                className="pointer-events-auto inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-surface/95 border border-line text-sm font-medium text-cream shadow-lg hover:border-brand"
              >
                <span aria-hidden="true" className="w-3 h-3 rounded-full bg-location ring-2 ring-white" />
                {location.status === 'locating' ? 'Hämtar position…' : 'Centrera på mig'}
              </button>
            </div>

            <div className="max-w-md mx-auto lg:mx-0">
              {selectedBar ? (
                <MapBarCard
                  bar={selectedBar}
                  now={now}
                  distance={distances.get(selectedBar.id) ?? null}
                  onClose={() => select(null)}
                />
              ) : (
                // Mobil: utdrag med barerna i vyn
                <div className="lg:hidden pointer-events-auto bg-surface/95 backdrop-blur-sm border border-line rounded-2xl shadow-2xl overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={listOpen}
                    aria-controls="map-list"
                    onClick={() => setListOpen(open => !open)}
                    className="w-full flex items-center justify-between gap-3 px-4 min-h-[52px] text-left"
                  >
                    <span className="text-sm">
                      <span className="text-cream font-medium">{listSummary}</span>
                      {cheapestPrice !== null && <span className="text-muted"> · billigast {cheapestPrice} kr</span>}
                    </span>
                    {listOpen
                      ? <ChevronDown aria-hidden="true" className="w-5 h-5 text-muted" />
                      : <ChevronUp aria-hidden="true" className="w-5 h-5 text-muted" />}
                  </button>
                  {listOpen && (
                    <div id="map-list" className="max-h-[50dvh] overflow-y-auto border-t border-line">
                      <MapBarList bars={inView} now={now} selectedId={selectedId} distances={distances} onPick={pickFromList} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

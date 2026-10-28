// DirectionsButton — fast knapp i tumzonen: "Vägbeskrivning · 600 m" (B3)
// Ligger ovanför bottenmenyn. Avståndet visas bara om användaren redan
// gett tillgång till sin position — knappen frågar inte själv.

'use client'

import { useEffect, useState } from 'react'
import { Navigation } from 'lucide-react'
import { directionsUrl, preferredMapsApp, type MapsApp } from '@/lib/directions'
import { distanceToBar, formatDistance } from '@/lib/geo'
import { useUserLocation } from '@/lib/useUserLocation'

type Props = {
  lat: number
  lng: number
}

export default function DirectionsButton({ lat, lng }: Props) {
  const [app, setApp] = useState<MapsApp>('google')
  const location = useUserLocation()
  const distance = distanceToBar(location.position, { lat, lng })

  // Plattformen kan bara avgöras i webbläsaren
  useEffect(() => setApp(preferredMapsApp(navigator.userAgent)), [])

  return (
    <div className="fixed inset-x-0 z-20 px-4 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] pointer-events-none">
      <a
        href={directionsUrl(lat, lng, app)}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto max-w-2xl mx-auto flex items-center justify-center gap-2 min-h-[52px] rounded-full bg-brand text-ink font-medium shadow-lg hover:bg-brand-light transition-colors"
      >
        <Navigation aria-hidden="true" className="w-5 h-5" />
        Vägbeskrivning
        {distance !== null && <span>· {formatDistance(distance)}</span>}
        <span className="sr-only"> (öppnas i {app === 'apple' ? 'Apple Kartor' : 'Google Maps'})</span>
      </a>
    </div>
  )
}

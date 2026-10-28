// useUserLocation — användarens position via Geolocation API
// Frågar om tillstånd först när användaren själv ber om det (request()).
// Valet sparas i localStorage så att vi inte frågar igen vid nästa besök.

'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LatLng } from './geo'

export type LocationStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable'

const STORAGE_KEY = 'sunkis:location-consent'

function readConsent(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function saveConsent(value: 'granted' | 'denied') {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Lagring blockerad — vi frågar igen nästa gång
  }
}

export function useUserLocation() {
  const [status, setStatus] = useState<LocationStatus>('idle')
  const [position, setPosition] = useState<LatLng | null>(null)

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable')
      return
    }
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('granted')
        saveConsent('granted')
      },
      err => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied')
          saveConsent('denied')
        } else {
          setStatus('unavailable')
        }
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    )
  }, [])

  // Tidigare val: hämta positionen direkt om användaren redan sagt ja
  useEffect(() => {
    const consent = readConsent()
    if (consent === 'granted') locate()
    else if (consent === 'denied') setStatus('denied')
  }, [locate])

  return { status, position, request: locate }
}

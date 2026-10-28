// Vägbeskrivning — djuplänkar till Apple Maps och Google Maps (B3)
// Kräver ingen API-nyckel och fungerar oberoende av kartbibliotek, se docs/kartval.md

export type MapsApp = 'apple' | 'google'

/**
 * Apple Maps på iPhone/iPad, annars Google Maps
 */
export function preferredMapsApp(userAgent: string): MapsApp {
  return /iPhone|iPad|iPod/i.test(userAgent) ? 'apple' : 'google'
}

/**
 * Länk till gångvägbeskrivning till en punkt
 */
export function directionsUrl(lat: number, lng: number, app: MapsApp): string {
  if (app === 'apple') return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`
  return `https://www.google.com/maps/dir/?api=1&destination=${lat}%2C${lng}&travelmode=walking`
}

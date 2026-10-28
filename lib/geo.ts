// Geografi — avstånd mellan två punkter och formatering för visning

export type LatLng = { lat: number; lng: number }

const EARTH_RADIUS_M = 6_371_000

/**
 * Avstånd i meter längs jordytan (haversine)
 */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Avstånd från användaren till en bar, eller null om något saknar koordinater
 */
export function distanceToBar(
  from: LatLng | null,
  bar: { lat: number | null; lng: number | null },
): number | null {
  if (!from || bar.lat === null || bar.lng === null) return null
  return distanceMeters(from, { lat: bar.lat, lng: bar.lng })
}

/**
 * "80 m", "600 m", "1,2 km", "12 km"
 */
export function formatDistance(meters: number): string {
  if (meters < 100) return `${Math.max(10, Math.round(meters / 10) * 10)} m`
  if (meters < 1000) return `${Math.round(meters / 50) * 50} m`
  if (meters < 10_000) return `${(Math.round(meters / 100) / 10).toString().replace('.', ',')} km`
  return `${Math.round(meters / 1000)} km`
}

// Sunkfaktorns skala — ett ord per nivå (B2)

export const SUNK_LEVELS = [
  { score: 1, label: 'Fint', description: 'Vita dukar och cocktailmeny' },
  { score: 2, label: 'Helt okej', description: 'Vanlig kvarterskrog' },
  { score: 3, label: 'Lagom sunkigt', description: 'Slitna stolar, ärlig stämning' },
  { score: 4, label: 'Sunkigt', description: 'Klibbigt golv och jukebox' },
  { score: 5, label: 'Äkta hak', description: 'Det är därför vi är här' },
] as const

/**
 * Ord för ett snitt — avrundas till närmaste hela nivå. null om inga röster.
 */
export function getSunkLabel(score: number | null | undefined): string | null {
  if (!score || score < 1) return null
  const level = Math.min(5, Math.max(1, Math.round(score)))
  return SUNK_LEVELS[level - 1].label
}

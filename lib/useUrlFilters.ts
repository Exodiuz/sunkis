// useUrlFilters — filterstate som speglas i URL:en (F2, K1)
// Läser window.location efter montering i stället för useSearchParams, så att
// startsidan och kartan kan förbli statiska (ISR) utan Suspense-gräns.

'use client'

import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_FILTERS, mergeFiltersIntoSearch, parseFilters, type BarFilters } from './filters'

export function useUrlFilters() {
  const [filters, setFiltersState] = useState<BarFilters>(DEFAULT_FILTERS)

  // Läs URL:en vid start och när användaren går bakåt/framåt
  useEffect(() => {
    const read = () => setFiltersState(parseFilters(new URLSearchParams(window.location.search)))
    read()
    window.addEventListener('popstate', read)
    return () => window.removeEventListener('popstate', read)
  }, [])

  const setFilters = useCallback((update: Partial<BarFilters> | ((prev: BarFilters) => BarFilters)) => {
    setFiltersState(prev => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update }
      const url = `${window.location.pathname}${mergeFiltersIntoSearch(window.location.search, next)}${window.location.hash}`
      window.history.replaceState(window.history.state, '', url)
      return next
    })
  }, [])

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [setFilters])

  return { filters, setFilters, resetFilters }
}

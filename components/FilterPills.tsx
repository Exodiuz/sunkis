// FilterPills — kombinerbara filter för listan (F2)
// Varje piller slås på och av för sig; område, maxpris och sunk väljs i menyer

'use client'

import { Clock, LocateFixed, Zap } from 'lucide-react'
import { MAX_PRICE_OPTIONS, MIN_SUNK_OPTIONS, type BarFilters } from '@/lib/filters'
import { SUNK_LEVELS } from '@/lib/sunk'
import { colors } from '@/lib/theme'

type Props = {
  filters: BarFilters
  areas: string[] // områden från datan (F3)
  onChange: (update: Partial<BarFilters>) => void
  nearMe?: boolean
  onToggleNearMe?: () => void // utelämnas när positionen inte går att använda
}

function pillClass(selected: boolean) {
  return `
    flex-shrink-0 inline-flex items-center min-h-[44px] px-4 rounded-full text-sm font-medium
    border transition-all duration-150
    ${selected
      ? 'bg-brand border-brand text-ink'
      : 'bg-surface border-line text-muted hover:border-brand hover:text-cream'
    }
  `
}

// Menyer som ser ut som piller; aktivt val markeras som ett aktivt piller
function selectClass(selected: boolean) {
  return `${pillClass(selected)} appearance-none pr-8 bg-no-repeat bg-[length:12px] bg-[right_12px_center]`
}

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='${encodeURIComponent(colors.muted)}' stroke-width='1.5'/%3E%3C/svg%3E")`

export default function FilterPills({ filters, areas, onChange, nearMe = false, onToggleNearMe }: Props) {
  return (
    // Horisontell scrollbar på mobil
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
      <button
        type="button"
        aria-pressed={filters.openNow}
        onClick={() => onChange({ openNow: !filters.openNow })}
        className={pillClass(filters.openNow)}
      >
        <Clock aria-hidden="true" className="w-4 h-4 mr-1.5" />
        Öppet nu
      </button>

      {/* Nära mig — frågar om position vid första tryck */}
      {onToggleNearMe && (
        <button type="button" aria-pressed={nearMe} onClick={onToggleNearMe} className={pillClass(nearMe)}>
          <LocateFixed aria-hidden="true" className="w-4 h-4 mr-1.5" />
          Nära mig
        </button>
      )}

      <button
        type="button"
        aria-pressed={filters.happyHour}
        onClick={() => onChange({ happyHour: !filters.happyHour })}
        className={pillClass(filters.happyHour)}
      >
        <Zap aria-hidden="true" className="w-4 h-4 mr-1.5" />
        Happy hour nu
      </button>

      <select
        aria-label="Maxpris per 40 cl"
        value={filters.maxPrice ?? ''}
        onChange={e => onChange({ maxPrice: e.target.value ? Number(e.target.value) : null })}
        className={selectClass(filters.maxPrice !== null)}
        style={{ backgroundImage: CHEVRON }}
      >
        <option value="">Alla priser</option>
        {MAX_PRICE_OPTIONS.map(p => (
          <option key={p} value={p}>Max {p} kr</option>
        ))}
      </select>

      <select
        aria-label="Minsta sunkfaktor"
        value={filters.minSunk ?? ''}
        onChange={e => onChange({ minSunk: e.target.value ? Number(e.target.value) : null })}
        className={selectClass(filters.minSunk !== null)}
        style={{ backgroundImage: CHEVRON }}
      >
        <option value="">All sunk</option>
        {MIN_SUNK_OPTIONS.map(n => (
          <option key={n} value={n}>{n === 5 ? '' : `${n}+ `}{SUNK_LEVELS[n - 1].label}</option>
        ))}
      </select>

      <select
        aria-label="Område"
        value={filters.area ?? ''}
        onChange={e => onChange({ area: e.target.value || null })}
        className={selectClass(filters.area !== null)}
        style={{ backgroundImage: CHEVRON }}
      >
        <option value="">Alla områden</option>
        {areas.map(area => (
          <option key={area} value={area}>{area}</option>
        ))}
      </select>
    </div>
  )
}

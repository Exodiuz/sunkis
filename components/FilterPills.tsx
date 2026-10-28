// FilterPills — klickbara filterknappar för startsidan
// Hanterar aktivt filter och skickar callback till förälder

'use client'

export type Filter =
  | 'alla'
  | 'öppet-nu'
  | 'happy-hour-nu'
  | 'Södermalm'
  | 'Kungsholmen'
  | 'Vasastan'
  | 'Östermalm'
  | 'City'

type Props = {
  active: Filter
  onChange: (filter: Filter) => void
  nearMe?: boolean
  onToggleNearMe?: () => void // utelämnas när positionen inte går att använda
}

// Tidsfilter visas först, sedan "Nära mig", sist områden
const TIME_FILTERS: { label: string; value: Filter }[] = [
  { label: 'Alla', value: 'alla' },
  { label: '🟢 Öppet nu', value: 'öppet-nu' },
  { label: '⚡ Happy hour nu', value: 'happy-hour-nu' },
]

const AREA_FILTERS: { label: string; value: Filter }[] = [
  { label: 'Södermalm', value: 'Södermalm' },
  { label: 'Kungsholmen', value: 'Kungsholmen' },
  { label: 'Vasastan', value: 'Vasastan' },
  { label: 'Östermalm', value: 'Östermalm' },
  { label: 'City', value: 'City' },
]

function pillClass(selected: boolean) {
  return `
    flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium
    border transition-all duration-150
    ${selected
      ? 'bg-[#BA7517] border-[#BA7517] text-white'
      : 'bg-[#2c2c2a] border-[#3a3a38] text-[#888780] hover:border-[#BA7517] hover:text-[#F1EFE8]'
    }
  `
}

export default function FilterPills({ active, onChange, nearMe = false, onToggleNearMe }: Props) {
  const pill = ({ label, value }: { label: string; value: Filter }) => (
    <button
      key={value}
      type="button"
      aria-pressed={active === value}
      onClick={() => onChange(value)}
      className={pillClass(active === value)}
    >
      {label}
    </button>
  )

  return (
    // Horisontell scrollbar på mobil
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
      {TIME_FILTERS.map(pill)}
      {/* Nära mig kombineras med övriga filter — frågar om position vid första tryck */}
      {onToggleNearMe && (
        <button type="button" aria-pressed={nearMe} onClick={onToggleNearMe} className={pillClass(nearMe)}>
          📍 Nära mig
        </button>
      )}
      {AREA_FILTERS.map(pill)}
    </div>
  )
}

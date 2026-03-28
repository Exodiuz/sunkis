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
}

// Alla tillgängliga filter med label och värde
const FILTERS: { label: string; value: Filter }[] = [
  { label: 'Alla', value: 'alla' },
  { label: '🟢 Öppet nu', value: 'öppet-nu' },
  { label: '⚡ Happy hour nu', value: 'happy-hour-nu' },
  { label: 'Södermalm', value: 'Södermalm' },
  { label: 'Kungsholmen', value: 'Kungsholmen' },
  { label: 'Vasastan', value: 'Vasastan' },
  { label: 'Östermalm', value: 'Östermalm' },
  { label: 'City', value: 'City' },
]

export default function FilterPills({ active, onChange }: Props) {
  return (
    // Horisontell scrollbar på mobil
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
      {FILTERS.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`
            flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium
            border transition-all duration-150
            ${active === value
              ? 'bg-[#BA7517] border-[#BA7517] text-white'
              : 'bg-[#2c2c2a] border-[#3a3a38] text-[#888780] hover:border-[#BA7517] hover:text-[#F1EFE8]'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

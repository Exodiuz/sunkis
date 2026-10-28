// PriceFreshness — "Bekräftat för 3 dagar sedan · 12 röster" (D3)
// Priser äldre än 90 dagar får etiketten "Kan vara inaktuellt"

import type { Bar } from '@/lib/supabase'
import { getFreshness } from '@/lib/freshness'

type Props = {
  bar: Pick<Bar, 'price_confirmed_at' | 'price_thumbs_up'>
  now?: Date
  className?: string
}

export default function PriceFreshness({ bar, now, className = 'text-sm' }: Props) {
  const { stale, label } = getFreshness(bar, now)
  return (
    <span className={`${className} text-[#A3A199]`}>
      {label}
      {stale && <span className="text-[#facc15]"> · Kan vara inaktuellt</span>}
    </span>
  )
}

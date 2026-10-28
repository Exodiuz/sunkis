// OpenStatus — "Öppet till 01:00" / "Öppnar 15:00" med färgad prick
// Samma logik (getOpenStatus) används i listan, på kortet och på detaljsidan

'use client'

import type { Bar } from '@/lib/supabase'
import { formatOpenStatus, getOpenStatus } from '@/lib/openingHours'
import { useNow } from '@/lib/useNow'

type Props = {
  bar: Pick<Bar, 'opening_hours'>
  now?: Date          // skickas in från listan så alla kort räknar på samma tid
  renderedAt?: number // används när komponenten står för sig själv (detaljsidan)
  className?: string
}

export default function OpenStatus({ bar, now, renderedAt, className = 'text-sm' }: Props) {
  const ownNow = useNow(renderedAt ?? Date.now())
  const status = getOpenStatus(bar, now ?? ownNow)
  const label = formatOpenStatus(status)
  if (!label) return null

  return (
    <span className={`${className} ${status.isOpen ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
      <span aria-hidden="true">● </span>
      {label}
    </span>
  )
}

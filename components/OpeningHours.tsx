// OpeningHours — veckoschema måndag → söndag med dagens rad markerad (B4)

'use client'

import { getWeekSchedule } from '@/lib/openingHours'
import { useNow } from '@/lib/useNow'

type Props = {
  hours: Record<string, string>
  renderedAt: number
}

export default function OpeningHours({ hours, renderedAt }: Props) {
  const now = useNow(renderedAt)
  const week = getWeekSchedule(hours, now)

  return (
    <dl className="space-y-0.5">
      {week.map(day => (
        <div
          key={day.day}
          aria-current={day.isToday ? 'date' : undefined}
          className={`flex justify-between text-sm rounded-lg px-2 py-1.5 -mx-2 ${
            day.isToday ? 'bg-line font-medium' : ''
          }`}
        >
          <dt className={day.isToday ? 'text-cream' : 'text-muted'}>
            {day.label}
            {day.isToday && <span className="sr-only"> (i dag)</span>}
          </dt>
          <dd className={day.closed ? 'text-danger' : 'text-cream'}>{day.hours}</dd>
        </div>
      ))}
    </dl>
  )
}

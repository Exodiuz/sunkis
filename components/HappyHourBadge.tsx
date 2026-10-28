// HappyHourBadge — visar "Happy hour just nu!" med grön animerad badge
// Används på bar-kort och detaljsida

type Props = {
  compact?: boolean // liten version för listan, stor för detaljsidan
}

export default function HappyHourBadge({ compact = false }: Props) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 border border-success/40 text-success text-sm font-medium animate-pulse-soft">
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        HH nu
      </span>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/30 text-success">
      {/* Pulserande grön prick */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
      </span>
      <span className="text-sm font-medium">Happy hour just nu!</span>
    </div>
  )
}

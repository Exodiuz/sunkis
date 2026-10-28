// HappyHourBadge — visar "Happy hour just nu!" med grön animerad badge
// Används på bar-kort och detaljsida

type Props = {
  compact?: boolean // liten version för listan, stor för detaljsidan
}

export default function HappyHourBadge({ compact = false }: Props) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#166534]/30 border border-[#4ade80]/40 text-[#4ade80] text-sm font-medium animate-pulse-amber">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
        HH nu
      </span>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#166534]/20 border border-[#4ade80]/30 text-[#4ade80]">
      {/* Pulserande grön prick */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ade80]" />
      </span>
      <span className="text-sm font-medium">Happy hour just nu!</span>
    </div>
  )
}

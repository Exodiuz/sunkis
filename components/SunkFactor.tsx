// SunkFactor — visar 1–5 fyllda cirklar (ölglas-känsla)
// Kan användas både för visning och för röstning

'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  score: number        // nuvarande snittpoäng (0–5)
  votes?: number       // antal röster
  barId?: string       // om angiven aktiveras röstningsläget
  size?: 'sm' | 'md'  // storlek på cirklarna
}

export default function SunkFactor({ score, votes, barId, size = 'md' }: Props) {
  // Hover-state för att visa vad användaren håller musen över
  const [hovered, setHovered] = useState<number | null>(null)
  const [voted, setVoted] = useState(false)
  const [loading, setLoading] = useState(false)

  // Roundar till närmaste 0.5 för visning
  const displayScore = hovered ?? Math.round(score * 2) / 2

  // Storlekar baserat på prop
  const circleSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1'

  // Rösta på sunkfaktor
  async function handleVote(value: number) {
    if (!barId || voted || loading) return
    setLoading(true)
    try {
      await supabase.from('sunk_votes').insert({ bar_id: barId, score: value })
      setVoted(true)
    } catch (e) {
      console.error('Röstning misslyckades:', e)
    } finally {
      setLoading(false)
    }
  }

  // Ritar 5 cirklar — fylld, halvfylld eller tom beroende på poäng
  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center ${gap}`}>
        {[1, 2, 3, 4, 5].map((i) => {
          // Beräkna fyllnadsgrad för denna cirkel
          const fill = Math.min(Math.max(displayScore - (i - 1), 0), 1)
          const isInteractive = !!barId && !voted

          return (
            <button
              key={i}
              type="button"
              disabled={!isInteractive || loading}
              onClick={() => handleVote(i)}
              onMouseEnter={() => isInteractive && setHovered(i)}
              onMouseLeave={() => isInteractive && setHovered(null)}
              className={`${circleSize} relative rounded-full overflow-hidden transition-transform ${
                isInteractive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
              }`}
              title={isInteractive ? `Ge ${i} sunkpoäng` : undefined}
            >
              {/* Tom cirkel som bakgrund */}
              <div className="absolute inset-0 rounded-full border border-[#888780]" />
              {/* Fylld del — täcker cirkeln baserat på fill-värdet */}
              <div
                className="absolute inset-0 rounded-full bg-[#EF9F27]"
                style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}
              />
            </button>
          )
        })}

        {/* Visa poäng som siffra bredvid cirklarna */}
        {score > 0 && (
          <span className="text-xs text-[#888780] ml-1">
            {score.toFixed(1)}
          </span>
        )}
      </div>

      {/* Visa antal röster om angiven */}
      {votes !== undefined && votes > 0 && (
        <span className="text-xs text-[#888780]">
          {votes} {votes === 1 ? 'röst' : 'röster'}
        </span>
      )}

      {/* Bekräftelse efter röstning */}
      {voted && (
        <span className="text-xs text-[#4ade80]">Tack för din röst!</span>
      )}
    </div>
  )
}

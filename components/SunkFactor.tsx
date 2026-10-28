// SunkFactor — visar 1–5 fyllda cirklar (ölglas-känsla)
// Kan användas både för visning och för röstning

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/deviceId'
import { SUNK_LEVELS, getSunkLabel } from '@/lib/sunk'
import { canVoteAgain, isAlreadyVoted, readOwnSunkVote, saveOwnSunkVote, type OwnVote } from '@/lib/votes'

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
  const [failed, setFailed] = useState(false)
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [justVoted, setJustVoted] = useState(false)
  // Lokalt snitt och antal så UI uppdateras direkt efter röstning
  const [localScore, setLocalScore] = useState(score)
  const [localVotes, setLocalVotes] = useState(votes)
  // Användarens egen röst, läses från localStorage efter montering (B1)
  const [ownVote, setOwnVote] = useState<OwnVote | null>(null)

  useEffect(() => {
    if (!barId) return
    const stored = readOwnSunkVote(barId)
    setOwnVote(stored)
    if (!canVoteAgain(stored)) setVoted(true)
  }, [barId])

  // Roundar till närmaste 0.5 för visning
  const displayScore = hovered ?? Math.round(localScore * 2) / 2

  // Storlekar baserat på prop
  const circleSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1'

  // Rösta på sunkfaktor via vote_sunk — uppdaterar snittet atomärt i databasen
  async function handleVote(value: number) {
    if (!barId || voted || loading) return
    setLoading(true)
    setFailed(false)

    const { data, error } = await supabase.rpc('vote_sunk', {
      bar_id: barId,
      score: value,
      device_id: getDeviceId(),
    })

    if (isAlreadyVoted(error)) {
      // En röst per enhet och bar per 24 h (C3)
      setAlreadyVoted(true)
    } else if (error) {
      console.error('Röstning misslyckades:', error)
      setFailed(true)
    } else {
      const result = data as { sunk_factor: number; sunk_votes: number; your_score: number }
      setLocalScore(result.sunk_factor)
      setLocalVotes(result.sunk_votes)
      saveOwnSunkVote(barId, result.your_score)
      setOwnVote({ score: result.your_score, at: Date.now() })
      setVoted(true)
      setJustVoted(true)
    }
    setLoading(false)
  }

  const isInteractive = !!barId && !voted && !alreadyVoted
  // "Inga röster än" i stället för 0 (B2)
  const hasVotes = localScore > 0 && (localVotes === undefined || localVotes > 0)
  const word = getSunkLabel(hovered ?? (hasVotes ? localScore : null))

  // Ritar 5 cirklar — fylld, halvfylld eller tom beroende på poäng
  return (
    <div className="flex flex-col gap-1">
      <div
        className={`flex items-center ${isInteractive ? '' : gap}`}
        role={isInteractive ? 'group' : 'img'}
        aria-label={
          isInteractive
            ? 'Rösta på sunkfaktor'
            : hasVotes ? `Sunkfaktor ${localScore.toFixed(1)} av 5, ${word}` : 'Sunkfaktor: inga röster än'
        }
      >
        {[1, 2, 3, 4, 5].map((i) => {
          // Beräkna fyllnadsgrad för denna cirkel
          const fill = Math.min(Math.max(displayScore - (i - 1), 0), 1)
          const circle = (
            <span className={`${circleSize} relative block rounded-full overflow-hidden`}>
              {/* Tom cirkel som bakgrund */}
              <span className="absolute inset-0 rounded-full border border-[#A3A199]" />
              {/* Fylld del — täcker cirkeln baserat på fill-värdet */}
              <span
                className="absolute inset-0 rounded-full bg-[#EF9F27]"
                style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}
              />
            </span>
          )

          if (!isInteractive) return <span key={i} aria-hidden="true">{circle}</span>

          // Röstläge: varje cirkel får en träffyta på 44 × 44 px
          return (
            <button
              key={i}
              type="button"
              disabled={loading}
              onClick={() => handleVote(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              className="w-11 h-11 flex items-center justify-center rounded-full cursor-pointer transition-transform hover:scale-110"
              aria-label={`Ge ${i} av 5 i sunkfaktor: ${SUNK_LEVELS[i - 1].label}`}
              title={SUNK_LEVELS[i - 1].label}
            >
              {circle}
            </button>
          )
        })}

        {/* Poäng och ord bredvid cirklarna, eller "Inga röster än" */}
        <span className="text-sm text-[#A3A199] ml-1" aria-hidden="true">
          {hovered
            ? word
            : hasVotes
              ? `${localScore.toFixed(1)}${size === 'md' ? ` · ${word}` : ''}`
              : 'Inga röster än'}
        </span>
      </div>

      {/* Visa antal röster om angiven */}
      {localVotes !== undefined && localVotes > 0 && (
        <span className="text-sm text-[#A3A199]">
          {localVotes} {localVotes === 1 ? 'röst' : 'röster'}
        </span>
      )}

      {/* Användarens egen röst och bekräftelse efter röstning */}
      {barId && ownVote && (
        <span className="text-sm text-[#A3A199]">Din röst: {ownVote.score} av 5</span>
      )}
      {justVoted && (
        <span className="text-sm text-[#4ade80]">Tack för din röst!</span>
      )}
      {failed && (
        <span className="text-sm text-[#f87171]">Rösten kunde inte sparas. Försök igen.</span>
      )}
      {alreadyVoted && !ownVote && (
        <span className="text-sm text-[#A3A199]">Du har redan röstat här i dag.</span>
      )}
    </div>
  )
}

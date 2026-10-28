// PriceVote — "Stämmer priset?" med 👍/👎-knappar
// Skickar röst till databasen och visar bekräftelse

'use client'

import { ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/deviceId'
import { isAlreadyVoted } from '@/lib/votes'
import SuggestPrice from './SuggestPrice'

type Props = {
  barId: string
  thumbsUp: number    // nuvarande antal thumbs up
  thumbsDown: number  // nuvarande antal thumbs down
}

export default function PriceVote({ barId, thumbsUp, thumbsDown }: Props) {
  const [voted, setVoted] = useState(false)
  const [loading, setLoading] = useState(false)
  // Lokal räknare så UI uppdateras direkt utan refresh
  const [localUp, setLocalUp] = useState(thumbsUp)
  const [localDown, setLocalDown] = useState(thumbsDown)

  const [failed, setFailed] = useState(false)
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  // Efter tumme ner frågar vi vad ölen kostar nu (C2)
  const [votedDown, setVotedDown] = useState(false)

  // Skicka röst via vote_price — sparar rösten och räknar upp atomärt i databasen
  async function vote(type: 'up' | 'down') {
    if (voted || loading) return
    setLoading(true)
    setFailed(false)

    const { data, error } = await supabase.rpc('vote_price', {
      bar_id: barId,
      vote: type,
      device_id: getDeviceId(),
    })

    if (isAlreadyVoted(error)) {
      // En röst per enhet och bar per 24 h (C3)
      setAlreadyVoted(true)
    } else if (error) {
      console.error('Röstning misslyckades:', error)
      setFailed(true)
    } else {
      const counts = data as { price_thumbs_up: number; price_thumbs_down: number }
      setLocalUp(counts.price_thumbs_up)
      setLocalDown(counts.price_thumbs_down)
      setVoted(true)
      setVotedDown(type === 'down')
    }
    setLoading(false)
  }

  // Visa varningsikon om för många thumbs down
  const priceUncertain = localDown >= 5

  // Full version för detaljsidan
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-[#A3A199]">Stämmer priset?</h3>
        {priceUncertain && (
          <span
            className="text-sm text-[#facc15]"
            title={`${localDown} säger att priset inte stämmer`}
          >
            <TriangleAlert aria-hidden="true" className="inline w-4 h-4 -mt-0.5 mr-1" />
            Osäkert pris
          </span>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => vote('up')}
          disabled={voted || alreadyVoted || loading}
          className="flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg bg-[#2c2c2a] border border-[#3a3a38] hover:border-[#4ade80] transition-colors disabled:opacity-50"
        >
          <ThumbsUp aria-hidden="true" className="w-5 h-5 text-[#4ade80]" />
          <div className="text-left">
            <div className="text-sm font-medium text-[#F1EFE8]">Ja, stämmer!</div>
            <div className="text-sm text-[#A3A199]">{localUp} röster</div>
          </div>
        </button>

        <button
          onClick={() => vote('down')}
          disabled={voted || alreadyVoted || loading}
          className="flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg bg-[#2c2c2a] border border-[#3a3a38] hover:border-[#f87171] transition-colors disabled:opacity-50"
        >
          <ThumbsDown aria-hidden="true" className="w-5 h-5 text-[#f87171]" />
          <div className="text-left">
            <div className="text-sm font-medium text-[#F1EFE8]">Nej, fel pris</div>
            <div className="text-sm text-[#A3A199]">{localDown} röster</div>
          </div>
        </button>
      </div>

      {voted && (
        <p className="text-sm text-[#4ade80]">Tack för din röst! Det hjälper andra.</p>
      )}
      {failed && (
        <p className="text-sm text-[#f87171]">Rösten kunde inte sparas. Försök igen.</p>
      )}
      {votedDown && (
        <div className="pt-1">
          <SuggestPrice barId={barId} label="Vad kostar den nu?" />
        </div>
      )}
      {alreadyVoted && (
        <p className="text-sm text-[#A3A199]">Du har redan röstat på priset här i dag.</p>
      )}
    </div>
  )
}

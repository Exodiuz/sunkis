// BarCard — ett bar-kort i rankinglistan
// Visar rank, namn, pris, sunkfaktor och röstningsknappar

'use client'

import Link from 'next/link'
import type { Bar } from '@/lib/supabase'
import { getCurrentPrice, isHappyHourActive, formatHappyHourTime, formatSize } from '@/lib/happyHour'
import SunkFactor from './SunkFactor'
import PriceVote from './PriceVote'
import HappyHourBadge from './HappyHourBadge'
import OpenStatus from './OpenStatus'

type Props = {
  bar: Bar
  rank?: number // placeringsnummer i listan — visas bara för barer med pris
  now: Date    // gemensam tid från listan
}

export default function BarCard({ bar, rank, now }: Props) {
  const { price, size, isHappyHour } = getCurrentPrice(bar, now)
  const hhActive = isHappyHourActive(bar, now)
  const priceUncertain = bar.price_thumbs_down >= 5

  return (
    <div className="flex flex-col bg-[#2c2c2a] rounded-xl border border-[#3a3a38] overflow-hidden hover:border-[#BA7517]/50 transition-colors">
      <div className="flex items-stretch gap-0">
        {/* Ranknummer — vänster kantkolumn, bara för barer med pris */}
        {rank !== undefined && price !== null && (
          <div className="flex items-center justify-center w-12 bg-[#232321] flex-shrink-0">
            <span className="text-lg font-medium text-[#888780]">#{rank}</span>
          </div>
        )}

        {/* Huvudinnehåll */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            {/* Vänster: namn, stadsdel, öppettider */}
            <div className="min-w-0">
              <Link href={`/bar/${bar.id}`} className="hover:text-[#EF9F27] transition-colors">
                <h2 className="font-medium text-[#F1EFE8] truncate">{bar.name}</h2>
              </Link>

              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {/* Stadsdel */}
                {bar.area && (
                  <span className="text-xs text-[#888780]">{bar.area}</span>
                )}

                {/* Öppet/stängt */}
                <OpenStatus bar={bar} now={now} />

                {/* Happy hour badge */}
                {hhActive && <HappyHourBadge compact />}
              </div>

              {/* Happy hour-tider om de finns men inte aktiva */}
              {bar.happy_hour_price && !hhActive && (
                <p className="text-xs text-[#888780] mt-0.5">
                  HH {formatHappyHourTime(bar)}: {bar.happy_hour_price} kr · {formatSize(bar.happy_hour_size || '40cl')}
                </p>
              )}
            </div>

            {/* Höger: pris */}
            <div className="flex-shrink-0 text-right">
              {price ? (
                <>
                  <div className="whitespace-nowrap">
                    <span className={`text-2xl font-medium ${isHappyHour ? 'text-[#4ade80]' : 'text-[#EF9F27]'}`}>
                      {price} kr
                    </span>
                    <span className="text-xs text-[#888780]"> · {formatSize(size)}</span>
                  </div>
                  {/* Varning om priset är osäkert */}
                  {priceUncertain && (
                    <div className="text-xs text-[#facc15]" title="Många har rapporterat felaktigt pris">
                      ⚠️ Osäkert
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-[#888780] italic">Pris saknas</div>
              )}
            </div>
          </div>

          {/* Botten: sunkfaktor och prisröstning */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#3a3a38]">
            <SunkFactor score={bar.sunk_factor} size="sm" />
            <PriceVote
              barId={bar.id}
              thumbsUp={bar.price_thumbs_up}
              thumbsDown={bar.price_thumbs_down}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// BarCard — ett bar-kort i rankinglistan
// Visar rank, namn, pris och sunkfaktor — röstning finns bara på detaljsidan

'use client'

import { TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import type { Bar } from '@/lib/supabase'
import { getCurrentPrice, isHappyHourActive, formatHappyHourTime, formatSize } from '@/lib/happyHour'
import SunkFactor from './SunkFactor'
import HappyHourBadge from './HappyHourBadge'
import OpenStatus from './OpenStatus'
import PriceFreshness from './PriceFreshness'
import { formatDistance } from '@/lib/geo'

type Props = {
  bar: Bar
  rank?: number // placeringsnummer i listan — visas bara för barer med pris
  now: Date    // gemensam tid från listan
  distance?: number | null // meter från användaren, om positionen är känd
}

export default function BarCard({ bar, rank, now, distance = null }: Props) {
  const { price, size, isHappyHour } = getCurrentPrice(bar, now)
  const hhActive = isHappyHourActive(bar, now)
  const priceUncertain = bar.price_thumbs_down >= 5

  return (
    <div className="relative flex flex-col bg-[#2c2c2a] rounded-xl border border-[#3a3a38] overflow-hidden hover:border-[#BA7517]/50 transition-colors">
      <div className="flex items-stretch gap-0">
        {/* Ranknummer — vänster kantkolumn, bara för barer med pris */}
        {rank !== undefined && price !== null && (
          <div className="flex items-center justify-center w-12 bg-[#232321] flex-shrink-0">
            <span className="text-lg font-medium text-[#A3A199]">#{rank}</span>
          </div>
        )}

        {/* Huvudinnehåll */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            {/* Vänster: namn, stadsdel, öppettider */}
            <div className="min-w-0">
              <Link
                href={`/bar/${bar.id}`}
                className="hover:text-[#EF9F27] transition-colors after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[#F5C55B]"
              >
                <h2 className="font-medium text-[#F1EFE8] truncate">{bar.name}</h2>
              </Link>

              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {/* Stadsdel */}
                {bar.area && (
                  <span className="text-sm text-[#A3A199]">{bar.area}</span>
                )}

                {/* Avstånd från användaren */}
                {distance !== null && (
                  <span className="text-sm text-[#A3A199]">{formatDistance(distance)}</span>
                )}

                {/* Öppet/stängt */}
                <OpenStatus bar={bar} now={now} />

                {/* Happy hour badge */}
                {hhActive && <HappyHourBadge compact />}
              </div>

              {/* Happy hour-tider om de finns men inte aktiva */}
              {bar.happy_hour_price && !hhActive && (
                <p className="text-sm text-[#A3A199] mt-0.5">
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
                    <span className="text-sm text-[#A3A199]"> · {formatSize(size)}</span>
                  </div>
                  {/* Varning om priset är osäkert */}
                  {priceUncertain && (
                    <div className="text-sm text-[#facc15]" title="Många har rapporterat felaktigt pris">
                      <TriangleAlert aria-hidden="true" className="inline w-4 h-4 -mt-0.5 mr-1" />
                      Osäkert
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-[#A3A199] italic">Pris saknas</div>
              )}
            </div>
          </div>

          {/* Botten: sunkfaktor och prisets färskhet */}
          <div className="flex items-center justify-between gap-2 flex-wrap mt-2 pt-2 border-t border-[#3a3a38]">
            <SunkFactor score={bar.sunk_factor} size="sm" />
            <PriceFreshness bar={bar} now={now} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Bar-detaljsida — visar all information om en specifik bar
// Server-side rendering med dynamisk route /bar/[id]

import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  isHappyHourActive,
  formatHappyHourTime,
  formatHappyHourDays,
  formatSize,
} from '@/lib/happyHour'
import SunkFactor from '@/components/SunkFactor'
import PriceVote from '@/components/PriceVote'
import HappyHourBadge from '@/components/HappyHourBadge'
import OpenStatus from '@/components/OpenStatus'

type Props = {
  params: { id: string }
}

// Hämtar en specifik bar från databasen
async function getBar(id: string) {
  const { data, error } = await supabase
    .from('bars')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data
}

// Genererar metadata för SEO per bar
export async function generateMetadata({ params }: Props) {
  const bar = await getBar(params.id)
  if (!bar) return { title: 'Sunkis' }
  return {
    title: `${bar.name} — Sunkis`,
    description: `${bar.name} i ${bar.area ?? 'Stockholm'}. ${bar.price_40cl ? `40cl: ${bar.price_40cl} kr.` : ''}`,
  }
}

// Dagnamn på svenska för öppettider
const DAY_LABELS: Record<string, string> = {
  monday: 'Måndag',
  tuesday: 'Tisdag',
  wednesday: 'Onsdag',
  thursday: 'Torsdag',
  friday: 'Fredag',
  saturday: 'Lördag',
  sunday: 'Söndag',
}

export const revalidate = 300

export default async function BarPage({ params }: Props) {
  const bar = await getBar(params.id)
  if (!bar) notFound()

  // hhActive används i mallen — getCurrentPrice används via BarCard på detaljsidan
  const hhActive = isHappyHourActive(bar)
  const openingHours = bar.opening_hours as Record<string, string> | null

  return (
    <div className="min-h-screen bg-[#1a1a18]">
      {/* Header */}
      <header className="bg-[#1a1a18]/95 backdrop-blur-sm border-b border-[#2c2c2a]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-[#888780] hover:text-[#EF9F27] transition-colors">
            ← Tillbaka
          </Link>
          <span className="text-[#3a3a38]">/</span>
          <Link href="/" className="text-xl font-medium">
            <span className="text-[#EF9F27]">sunk</span>
            <span className="text-[#F5C55B]">is</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Foto om det finns */}
        {bar.photo_url && (
          <div className="relative w-full h-52 rounded-xl overflow-hidden">
            <Image
              src={bar.photo_url}
              alt={`${bar.name} — foto`}
              fill
              className="object-cover"
              sizes="(max-width: 672px) 100vw, 672px"
            />
            {/* Gradient för bättre läsbarhet av text ovanpå bild */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a18]/80 to-transparent" />
          </div>
        )}

        {/* Namn och grundinfo */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-medium text-[#F1EFE8]">{bar.name}</h1>
              {bar.area && <p className="text-[#888780]">{bar.area}</p>}
              {bar.address && <p className="text-sm text-[#888780] mt-0.5">{bar.address}</p>}
              <OpenStatus bar={bar} renderedAt={Date.now()} className="text-sm mt-1 inline-block" />
            </div>
            {/* Google-betyg om det finns */}
            {bar.google_rating && (
              <div className="flex-shrink-0 text-center bg-[#2c2c2a] rounded-lg px-3 py-2">
                <div className="text-[#EF9F27] font-medium">{bar.google_rating.toFixed(1)}</div>
                <div className="text-xs text-[#888780]">Google</div>
              </div>
            )}
          </div>

          {/* Happy hour badge */}
          {hhActive && <HappyHourBadge />}
        </div>

        {/* Priser */}
        <div className="bg-[#2c2c2a] rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-[#888780] uppercase tracking-wide">Priser</h2>

          <div className="flex flex-wrap gap-4">
            {/* 40cl */}
            {bar.price_40cl && (
              <div>
                <div className="text-3xl font-medium text-[#EF9F27]">{bar.price_40cl} kr</div>
                <div className="text-xs text-[#888780]">40 cl</div>
              </div>
            )}
            {/* 50cl */}
            {bar.price_50cl && (
              <div>
                <div className="text-3xl font-medium text-[#EF9F27]">{bar.price_50cl} kr</div>
                <div className="text-xs text-[#888780]">50 cl</div>
              </div>
            )}
            {/* Happy hour */}
            {bar.happy_hour_price && (
              <div>
                <div className={`text-3xl font-medium ${hhActive ? 'text-[#4ade80]' : 'text-[#F1EFE8]'}`}>
                  {bar.happy_hour_price} kr
                </div>
                <div className="text-xs text-[#888780]">
                  {formatSize(bar.happy_hour_size || '40cl')} · Happy hour {formatHappyHourTime(bar)}
                </div>
              </div>
            )}
          </div>

          {/* Happy hour-info */}
          {bar.happy_hour_price && (
            <div className="text-sm text-[#888780] pt-1">
              Happy hour: {formatHappyHourTime(bar)} på {formatHappyHourDays(bar.happy_hour_days)}
            </div>
          )}

          {/* Verifieringsindikator */}
          <div className="flex items-center gap-2 pt-1">
            {bar.price_verified ? (
              <span className="text-xs text-[#4ade80]">✓ Prisverifierat</span>
            ) : (
              <span className="text-xs text-[#888780]">Ej verifierat</span>
            )}
          </div>
        </div>

        {/* Sunkfaktor */}
        <div className="bg-[#2c2c2a] rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-[#888780] uppercase tracking-wide">Sunkfaktor</h2>
          <SunkFactor score={bar.sunk_factor} votes={bar.sunk_votes} barId={bar.id} />
        </div>

        {/* Stämmer priset? */}
        <div className="bg-[#2c2c2a] rounded-xl p-4">
          <PriceVote
            barId={bar.id}
            thumbsUp={bar.price_thumbs_up}
            thumbsDown={bar.price_thumbs_down}
          />
        </div>

        {/* Öppettider */}
        {openingHours && Object.keys(openingHours).length > 0 && (
          <div className="bg-[#2c2c2a] rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-medium text-[#888780] uppercase tracking-wide">Öppettider</h2>
            <div className="space-y-1.5">
              {Object.entries(openingHours).map(([day, hours]) => (
                <div key={day} className="flex justify-between text-sm">
                  <span className="text-[#888780]">{DAY_LABELS[day] ?? day}</span>
                  <span className={hours === 'stängt' ? 'text-[#f87171]' : 'text-[#F1EFE8]'}>
                    {hours}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kontakt och länkar */}
        <div className="flex flex-wrap gap-3">
          {/* Google Maps-länk */}
          {bar.lat && bar.lng && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${bar.lat},${bar.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#2c2c2a] border border-[#3a3a38] rounded-lg text-sm text-[#888780] hover:text-[#EF9F27] hover:border-[#BA7517] transition-colors"
            >
              📍 Öppna i Google Maps
            </a>
          )}

          {/* Webbplats */}
          {bar.website && (
            <a
              href={bar.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#2c2c2a] border border-[#3a3a38] rounded-lg text-sm text-[#888780] hover:text-[#EF9F27] hover:border-[#BA7517] transition-colors"
            >
              🌐 Webbplats
            </a>
          )}

          {/* Telefon */}
          {bar.phone && (
            <a
              href={`tel:${bar.phone}`}
              className="flex items-center gap-2 px-4 py-2 bg-[#2c2c2a] border border-[#3a3a38] rounded-lg text-sm text-[#888780] hover:text-[#EF9F27] hover:border-[#BA7517] transition-colors"
            >
              📞 {bar.phone}
            </a>
          )}
        </div>

        {/* Tillbaka-knapp */}
        <Link
          href="/"
          className="inline-block text-sm text-[#888780] hover:text-[#EF9F27] transition-colors"
        >
          ← Tillbaka till listan
        </Link>
      </main>
    </div>
  )
}

// Bar-detaljsida — visar all information om en specifik bar
// Server-side rendering med dynamisk route /bar/[id]

import { ArrowLeft, Check, Globe, Phone } from 'lucide-react'
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
import OpeningHours from '@/components/OpeningHours'
import DirectionsButton from '@/components/DirectionsButton'
import PriceFreshness from '@/components/PriceFreshness'
import { SUNK_LEVELS } from '@/lib/sunk'

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

export const revalidate = 300

export default async function BarPage({ params }: Props) {
  const bar = await getBar(params.id)
  if (!bar) notFound()

  // hhActive används i mallen — getCurrentPrice används via BarCard på detaljsidan
  const hhActive = isHappyHourActive(bar)
  const openingHours = bar.opening_hours as Record<string, string> | null

  return (
    <div className="min-h-screen bg-ink">
      {/* Header */}
      <header className="bg-ink/95 backdrop-blur-sm border-b border-surface">
        <div className="max-w-2xl mx-auto px-4 py-1 flex items-center gap-3">
          <Link href="/" className="inline-flex items-center min-h-[44px] text-muted hover:text-brand-light transition-colors">
            <ArrowLeft aria-hidden="true" className="w-4 h-4 mr-1" />
            Tillbaka
          </Link>
          <span className="text-line">/</span>
          <Link href="/" className="inline-flex items-center min-h-[44px] text-xl font-display font-bold">
            <span className="text-brand">sunk</span>
            <span className="text-teal">is</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-6">
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
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
          </div>
        )}

        {/* Namn och grundinfo */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-medium text-cream">{bar.name}</h1>
              {bar.area && <p className="text-muted">{bar.area}</p>}
              {bar.address && <p className="text-sm text-muted mt-0.5">{bar.address}</p>}
              <OpenStatus bar={bar} renderedAt={Date.now()} className="text-sm mt-1 inline-block" />
            </div>
            {/* Google-betyg om det finns */}
            {bar.google_rating && (
              <div className="flex-shrink-0 text-center bg-surface rounded-lg px-3 py-2">
                <div className="text-brand-light font-medium">{bar.google_rating.toFixed(1)}</div>
                <div className="text-sm text-muted">Google</div>
              </div>
            )}
          </div>

          {/* Happy hour badge */}
          {hhActive && <HappyHourBadge />}
        </div>

        {/* Priser */}
        <div className="bg-surface rounded-xl p-4 space-y-3">
          <h2 className="font-display text-sm font-medium text-muted uppercase tracking-wide">Priser</h2>

          <div className="flex flex-wrap gap-4">
            {/* 40cl */}
            {bar.price_40cl && (
              <div>
                <div className="font-mono text-3xl font-bold text-brand-light">{bar.price_40cl} kr</div>
                <div className="text-sm text-muted">40 cl</div>
              </div>
            )}
            {/* 50cl */}
            {bar.price_50cl && (
              <div>
                <div className="font-mono text-3xl font-bold text-brand-light">{bar.price_50cl} kr</div>
                <div className="text-sm text-muted">50 cl</div>
              </div>
            )}
            {/* Happy hour */}
            {bar.happy_hour_price && (
              <div>
                <div className={`font-mono text-3xl font-bold ${hhActive ? 'text-success' : 'text-cream'}`}>
                  {bar.happy_hour_price} kr
                </div>
                <div className="text-sm text-muted">
                  {formatSize(bar.happy_hour_size || '40cl')} · Happy hour {formatHappyHourTime(bar)}
                </div>
              </div>
            )}
          </div>

          {/* Happy hour-info */}
          {bar.happy_hour_price && (
            <div className="text-sm text-muted pt-1">
              Happy hour: {formatHappyHourTime(bar)} på {formatHappyHourDays(bar.happy_hour_days)}
            </div>
          )}

          {/* Verifiering och färskhet (D3) */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {bar.price_verified ? (
              <span className="inline-flex items-center gap-1 text-sm text-success"><Check aria-hidden="true" className="w-4 h-4" /> Prisverifierat</span>
            ) : (
              <span className="text-sm text-muted">Ej verifierat</span>
            )}
            <PriceFreshness bar={bar} className="text-sm" />
          </div>
        </div>

        {/* Sunkfaktor */}
        <div className="bg-surface rounded-xl p-4 space-y-3">
          <h2 className="font-display text-sm font-medium text-muted uppercase tracking-wide">Sunkfaktor</h2>
          <SunkFactor score={bar.sunk_factor} votes={bar.sunk_votes} barId={bar.id} />
          {/* Förklaring av skalan (B2) */}
          <details className="text-sm text-muted">
            <summary className="cursor-pointer min-h-[44px] flex items-center text-brand-light">Vad betyder sunkfaktor?</summary>
            <ul className="space-y-1 pt-1">
              {SUNK_LEVELS.map(level => (
                <li key={level.score}>
                  <span className="text-cream">{level.score} – {level.label}:</span> {level.description}
                </li>
              ))}
            </ul>
          </details>
        </div>

        {/* Stämmer priset? */}
        <div className="bg-surface rounded-xl p-4">
          <PriceVote
            barId={bar.id}
            thumbsUp={bar.price_thumbs_up}
            thumbsDown={bar.price_thumbs_down}
          />
        </div>

        {/* Öppettider */}
        {openingHours && Object.keys(openingHours).length > 0 && (
          <div className="bg-surface rounded-xl p-4 space-y-3">
            <h2 className="font-display text-sm font-medium text-muted uppercase tracking-wide">Öppettider</h2>
            <OpeningHours hours={openingHours} renderedAt={Date.now()} />
          </div>
        )}

        {/* Kontakt och länkar */}
        <div className="flex flex-wrap gap-3">
          {/* Webbplats */}
          {bar.website && (
            <a
              href={bar.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-surface border border-line rounded-lg text-sm text-muted hover:text-brand-light hover:border-brand transition-colors"
            >
              <Globe aria-hidden="true" className="w-4 h-4" />
              Webbplats
            </a>
          )}

          {/* Telefon */}
          {bar.phone && (
            <a
              href={`tel:${bar.phone}`}
              className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-surface border border-line rounded-lg text-sm text-muted hover:text-brand-light hover:border-brand transition-colors"
            >
              <Phone aria-hidden="true" className="w-4 h-4" />
              {bar.phone}
            </a>
          )}
        </div>

        {/* Tillbaka-knapp */}
        <Link
          href="/"
          className="inline-flex items-center min-h-[44px] text-sm text-muted hover:text-brand-light transition-colors"
        >
          <ArrowLeft aria-hidden="true" className="w-4 h-4 mr-1" />
          Tillbaka till listan
        </Link>
      </main>

      {/* Vägbeskrivning i tumzonen (B3) */}
      {bar.lat !== null && bar.lng !== null && <DirectionsButton lat={bar.lat} lng={bar.lng} />}
    </div>
  )
}

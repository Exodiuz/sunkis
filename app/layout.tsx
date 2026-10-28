// Global layout — laddas för alla sidor
// Laddar varumärkets typsnitt via next/font och sätter metadata (V1)

import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Schibsted_Grotesk, Space_Mono } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import { colors } from '@/lib/theme'

// Rubriker och logga
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

// Brödtext
const sans = Schibsted_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

// Priser
const mono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
})

// SEO-metadata för hela sajten
export const metadata: Metadata = {
  title: 'Sunkis — Billigaste ölet i Stockholm',
  description: 'Hitta billigaste ölet på bar i Stockholm. Rankinglista, karta, happy hour och sunkfaktor.',
  manifest: '/manifest.json',
  keywords: ['billigaste ölet', 'stockholm', 'bar', 'happy hour', 'öl', 'sunkis'],
  openGraph: {
    title: 'Sunkis — Billigaste ölet i Stockholm',
    description: 'Hitta billigaste ölet på bar i Stockholm.',
    type: 'website',
    locale: 'sv_SE',
  },
}

// Viewport och themeColor måste exporteras separat i Next.js 14+
export const viewport: Viewport = {
  themeColor: colors.ink,
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        {/* Favicon — SVG-ikonen som genererades av scripts/generate-icons.js */}
        <link rel="icon" href="/icons/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="font-sans antialiased min-h-screen bg-ink text-cream">
        {children}
        <BottomNav />
      </body>
    </html>
  )
}

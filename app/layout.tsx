// Global layout — laddas för alla sidor
// Laddar Inter-fonten från Google Fonts och sätter metadata

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Inter-fonten med svenska tecken
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
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
  themeColor: '#1a1a18',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv" className={inter.variable}>
      <head>
        {/* Favicon — SVG-ikonen som genererades av scripts/generate-icons.js */}
        <link rel="icon" href="/icons/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="font-sans antialiased min-h-screen bg-[#1a1a18] text-[#F1EFE8]">
        {children}
      </body>
    </html>
  )
}

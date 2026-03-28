/** @type {import('next').NextConfig} */
// Next.js-konfiguration för Sunkis
// Tillåter externa bilddomäner (Google Places-foton)

const nextConfig = {
  images: {
    // Tillåt bilder från Google Places API och Maps
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        pathname: '/maps/api/place/photo/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  // Experimentella funktioner för bättre prestanda
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
}

export default nextConfig

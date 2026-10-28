// Tailwind-konfiguration för Sunkis
// Utökar med Sunkis-färger och Inter-font

import type { Config } from 'tailwindcss'

const config: Config = {
  // Tailwind scannar dessa filer för CSS-klasser
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Sunkis-färgpalett som Tailwind-klasser
      colors: {
        sunkis: {
          bg:      '#1a1a18',
          surface: '#2c2c2a',
          amber:   '#EF9F27',
          accent:  '#BA7517',
          muted:   '#A3A199',
          light:   '#F1EFE8',
        },
      },
      // Inter-font via CSS-variabel
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      // Animeringar för happy hour-badge
      animation: {
        'pulse-amber': 'pulse-amber 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-amber': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}

export default config

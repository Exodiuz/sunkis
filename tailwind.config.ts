// Tailwind-konfiguration för Sunkis
// Färger och typsnitt kommer från varumärket i lib/theme.ts (V1)

import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import { colors, cssColorVariables } from './lib/theme'

const config: Config = {
  // Tailwind scannar dessa filer för CSS-klasser
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Varumärkets färger som Tailwind-klasser: bg-ink, text-brand-light, border-line …
      colors,
      // Typsnitt laddas med next/font i app/layout.tsx
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      // Animeringar för happy hour-badge
      animation: {
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [
    // Samma färger som CSS-variabler (--color-ink …) för globals.css
    plugin(({ addBase }) => {
      addBase({ ':root': cssColorVariables() })
    }),
  ],
}

export default config

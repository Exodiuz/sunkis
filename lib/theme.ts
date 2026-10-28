// Sunkis varumärke (V1) — den enda platsen där färger anges som hex.
// Tailwind-tokens och CSS-variablerna (--color-*) genereras härifrån i
// tailwind.config.ts; kod som behöver färger i JS (kartan) importerar dem.

export const colors = {
  // Ytor
  ink: '#1A1A18',        // sidbakgrund
  surface: '#2C2C2A',    // kort och paneler
  sunken: '#232321',     // nedsänkt kolumn i kort
  line: '#3A3A38',       // ramar och avdelare

  // Text
  cream: '#F1EFE8',      // brödtext
  muted: '#A3A199',      // sekundär text (5,4:1 på surface)

  // Varumärke
  brand: {
    DEFAULT: '#FF3D8B',  // rosa — fyllnader, logga, stor text (mörk text ovanpå: 5,2:1)
    light: '#FF7AB0',    // rosa för liten text på surface (5,8:1)
  },
  teal: '#1FB8A6',       // turkos — logga, fokusring, sekundär accent

  // Status
  success: '#4ADE80',    // öppet, happy hour, billigt
  danger: '#F87171',     // stängt, fel, dyrt
  warning: '#FACC15',    // osäkert, mellanpris
  location: '#3B82F6',   // användarens position på kartan
  white: '#FFFFFF',
} as const

// Platta namn för CSS-variabler: brand.light → --color-brand-light
export function cssColorVariables(): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [name, value] of Object.entries(colors)) {
    if (typeof value === 'string') vars[`--color-${name}`] = value
    else for (const [shade, hex] of Object.entries(value)) {
      vars[shade === 'DEFAULT' ? `--color-${name}` : `--color-${name}-${shade}`] = hex
    }
  }
  return vars
}

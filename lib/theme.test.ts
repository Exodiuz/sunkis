import { describe, expect, it } from 'vitest'
import { colors, cssColorVariables } from './theme'

// WCAG-kontrast mellan två hex-färger
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('färgtokens', () => {
  it('genererar CSS-variabler för alla tokens', () => {
    const vars = cssColorVariables()
    expect(vars['--color-ink']).toBe(colors.ink)
    expect(vars['--color-brand']).toBe(colors.brand.DEFAULT)
    expect(vars['--color-brand-light']).toBe(colors.brand.light)
  })

  it('klarar WCAG AA för textkombinationerna appen använder', () => {
    expect(contrast(colors.cream, colors.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.muted, colors.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.brand.light, colors.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.teal, colors.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.ink, colors.brand.DEFAULT)).toBeGreaterThanOrEqual(4.5)   // knapptext
    expect(contrast(colors.ink, colors.brand.light)).toBeGreaterThanOrEqual(4.5)     // knapp i hover
    expect(contrast(colors.brand.DEFAULT, colors.ink)).toBeGreaterThanOrEqual(4.5)   // logga
    expect(contrast(colors.success, colors.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.danger, colors.surface)).toBeGreaterThanOrEqual(4.5)
  })
})

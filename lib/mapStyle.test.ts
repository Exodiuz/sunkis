import { describe, expect, it } from 'vitest'
import { MAP_STYLES, mapThemeFromDocument } from './mapStyle'

describe('mapThemeFromDocument', () => {
  it('använder mörk stil om inget annat anges', () => {
    expect(mapThemeFromDocument({ dataset: {} })).toBe('dark')
    expect(mapThemeFromDocument({ dataset: { theme: 'dark' } })).toBe('dark')
  })

  it('använder ljus stil i ljust tema', () => {
    expect(mapThemeFromDocument({ dataset: { theme: 'light' } })).toBe('light')
    expect(MAP_STYLES.light).toContain('positron')
    expect(MAP_STYLES.dark).toContain('/dark')
  })
})

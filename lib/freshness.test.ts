import { describe, expect, it } from 'vitest'
import { getFreshness } from './freshness'

const now = new Date('2026-10-28T12:00:00Z')

describe('getFreshness', () => {
  it('visar dagar sedan bekräftelse och antal röster', () => {
    expect(getFreshness({ price_confirmed_at: '2026-10-25T12:00:00Z', price_thumbs_up: 12 }, now)).toEqual({
      daysAgo: 3,
      stale: false,
      label: 'Bekräftat för 3 dagar sedan · 12 röster',
    })
  })

  it('säger i dag och i går', () => {
    expect(getFreshness({ price_confirmed_at: '2026-10-28T08:00:00Z', price_thumbs_up: 1 }, now).label)
      .toBe('Bekräftat i dag · 1 röst')
    expect(getFreshness({ price_confirmed_at: '2026-10-27T08:00:00Z', price_thumbs_up: 0 }, now).label)
      .toBe('Bekräftat i går')
  })

  it('märker priser äldre än 90 dagar som inaktuella', () => {
    expect(getFreshness({ price_confirmed_at: '2026-07-30T12:00:00Z', price_thumbs_up: 0 }, now).stale).toBe(false) // 90 dagar
    expect(getFreshness({ price_confirmed_at: '2026-07-29T12:00:00Z', price_thumbs_up: 0 }, now).stale).toBe(true)  // 91 dagar
  })

  it('räknar aldrig bekräftade priser som inaktuella', () => {
    expect(getFreshness({ price_confirmed_at: null, price_thumbs_up: 0 }, now)).toEqual({
      daysAgo: null,
      stale: true,
      label: 'Inte bekräftat',
    })
  })

  it('hanterar tid i framtiden som i dag', () => {
    expect(getFreshness({ price_confirmed_at: '2026-10-29T12:00:00Z', price_thumbs_up: 0 }, now).daysAgo).toBe(0)
  })
})

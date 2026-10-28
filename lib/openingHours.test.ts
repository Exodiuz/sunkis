import { describe, expect, it } from 'vitest'
import { formatOpenStatus, getOpenStatus, parseDayHours } from './openingHours'

// Onsdag 28 oktober 2026 — vintertid (UTC+1)
const winter = (time: string) => new Date(`2026-10-28T${time}:00+01:00`)
// Onsdag 1 juli 2026 — sommartid (UTC+2)
const summer = (time: string) => new Date(`2026-07-01T${time}:00+02:00`)

const weekdays = {
  monday: '15:00–01:00',
  tuesday: '15:00–01:00',
  wednesday: '15:00–01:00',
  thursday: '15:00–01:00',
  friday: '15:00–03:00',
  saturday: '14:00–03:00',
  sunday: 'stängt',
}

describe('parseDayHours', () => {
  it('tolkar en-dash och bindestreck', () => {
    expect(parseDayHours('15:00–01:00')).toEqual([{ start: 900, end: 1500 }])
    expect(parseDayHours('15:00-01:00')).toEqual([{ start: 900, end: 1500 }])
    expect(parseDayHours('15:00 - 23:00')).toEqual([{ start: 900, end: 1380 }])
  })

  it('tolkar stängt, tomt och skräp som inga pass', () => {
    expect(parseDayHours('stängt')).toEqual([])
    expect(parseDayHours('Stängt')).toEqual([])
    expect(parseDayHours('')).toEqual([])
    expect(parseDayHours(undefined)).toEqual([])
    expect(parseDayHours('ring och fråga')).toEqual([])
  })

  it('tolkar dygnet runt och flera pass', () => {
    expect(parseDayHours('00:00–24:00')).toEqual([{ start: 0, end: 1440 }])
    expect(parseDayHours('11:00–14:00, 17:00–23:00')).toEqual([
      { start: 660, end: 840 },
      { start: 1020, end: 1380 },
    ])
  })
})

describe('getOpenStatus', () => {
  const bar = { opening_hours: weekdays }

  it('är stängd kl 10:00 före öppning och visar när den öppnar', () => {
    expect(getOpenStatus(bar, winter('10:00'))).toEqual({ isOpen: false, opensAt: '15:00' })
  })

  it('är öppen under dagens pass och visar stängningstid efter midnatt', () => {
    expect(getOpenStatus(bar, winter('18:30'))).toEqual({ isOpen: true, closesAt: '01:00' })
  })

  it('räknar gårdagens pass kl 00:30 efter midnatt', () => {
    // Torsdag 00:30 — onsdagens pass 15:00–01:00 pågår fortfarande
    expect(getOpenStatus(bar, new Date('2026-10-29T00:30:00+01:00'))).toEqual({
      isOpen: true,
      closesAt: '01:00',
    })
  })

  it('är stängd när gårdagens pass har tagit slut', () => {
    expect(getOpenStatus(bar, new Date('2026-10-29T01:00:00+01:00'))).toEqual({
      isOpen: false,
      opensAt: '15:00',
    })
  })

  it('räknar lördagens pass in på söndagen trots att söndag är stängd', () => {
    // Söndag 1 november 02:15
    expect(getOpenStatus(bar, new Date('2026-11-01T02:15:00+01:00'))).toEqual({
      isOpen: true,
      closesAt: '03:00',
    })
  })

  it('är stängd en stängd dag och visar nästa öppningsdag', () => {
    expect(getOpenStatus(bar, new Date('2026-11-01T18:00:00+01:00'))).toEqual({
      isOpen: false,
      opensAt: '15:00',
      opensDay: 'monday',
    })
  })

  it('räknar en saknad dag som stängd', () => {
    const { wednesday: _omitted, ...rest } = weekdays
    void _omitted
    expect(getOpenStatus({ opening_hours: rest }, winter('18:00'))).toEqual({
      isOpen: false,
      opensAt: '15:00',
      opensDay: 'thursday',
    })
  })

  it('returnerar okänt när öppettider saknas helt', () => {
    expect(getOpenStatus({ opening_hours: null }, winter('18:00'))).toEqual({ isOpen: false, unknown: true })
    expect(getOpenStatus({ opening_hours: {} }, winter('18:00'))).toEqual({ isOpen: false, unknown: true })
  })

  it('returnerar stängt utan nästa öppning om alla dagar är stängda', () => {
    expect(getOpenStatus({ opening_hours: { monday: 'stängt' } }, winter('18:00'))).toEqual({ isOpen: false })
  })

  it('räknar i Stockholmstid även på sommartid', () => {
    // 13:30 UTC = 15:30 i Stockholm på sommaren
    expect(getOpenStatus(bar, new Date('2026-07-01T13:30:00Z')).isOpen).toBe(true)
    expect(getOpenStatus(bar, summer('14:59')).isOpen).toBe(false)
  })

  it('hanterar dygnet runt', () => {
    expect(getOpenStatus({ opening_hours: { wednesday: '00:00–24:00' } }, winter('03:00'))).toEqual({
      isOpen: true,
      closesAt: '00:00',
    })
  })
})

describe('formatOpenStatus', () => {
  it('formaterar alla lägen', () => {
    expect(formatOpenStatus({ isOpen: true, closesAt: '01:00' })).toBe('Öppet till 01:00')
    expect(formatOpenStatus({ isOpen: false, opensAt: '15:00' })).toBe('Öppnar 15:00')
    expect(formatOpenStatus({ isOpen: false, opensAt: '15:00', opensDay: 'friday' })).toBe('Öppnar fre 15:00')
    expect(formatOpenStatus({ isOpen: false })).toBe('Stängt')
    expect(formatOpenStatus({ isOpen: false, unknown: true })).toBeNull()
  })
})

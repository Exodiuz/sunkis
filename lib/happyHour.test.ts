import { describe, expect, it } from 'vitest'
import {
  formatSize,
  getComparablePrice,
  getCurrentPrice,
  isHappyHourActive,
  parseSize,
  toComparable,
} from './happyHour'

// Onsdag 28 oktober 2026 — vintertid (UTC+1)
const wed = (time: string) => new Date(`2026-10-28T${time}:00+01:00`)

const base = {
  price_40cl: null as number | null,
  price_50cl: null as number | null,
  happy_hour_price: null as number | null,
  happy_hour_start: null as string | null,
  happy_hour_end: null as string | null,
  happy_hour_days: null as string[] | null,
  happy_hour_size: null as string | null,
}

const hhBar = {
  ...base,
  price_40cl: 45,
  happy_hour_price: 30,
  happy_hour_start: '15:00:00', // TIME-kolumner kommer med sekunder
  happy_hour_end: '18:00:00',
  happy_hour_days: ['monday', 'tuesday', 'wednesday'],
}

describe('isHappyHourActive', () => {
  it('är aktiv inom tiden en giltig dag', () => {
    expect(isHappyHourActive(hhBar, wed('16:00'))).toBe(true)
  })

  it('är inaktiv före start och vid sluttid', () => {
    expect(isHappyHourActive(hhBar, wed('14:59'))).toBe(false)
    expect(isHappyHourActive(hhBar, wed('18:00'))).toBe(false)
  })

  it('är inaktiv en dag som inte ingår', () => {
    expect(isHappyHourActive(hhBar, new Date('2026-10-29T16:00:00+01:00'))).toBe(false)
  })

  it('gäller alla dagar när dagar saknas', () => {
    expect(isHappyHourActive({ ...hhBar, happy_hour_days: null }, new Date('2026-10-29T16:00:00+01:00'))).toBe(true)
    expect(isHappyHourActive({ ...hhBar, happy_hour_days: [] }, new Date('2026-10-29T16:00:00+01:00'))).toBe(true)
  })

  it('hanterar happy hour över midnatt och räknar natten till startdagen', () => {
    const late = { ...hhBar, happy_hour_start: '22:00', happy_hour_end: '01:00', happy_hour_days: ['wednesday'] }
    expect(isHappyHourActive(late, wed('23:00'))).toBe(true)
    // Torsdag 00:30 — onsdagens happy hour pågår
    expect(isHappyHourActive(late, new Date('2026-10-29T00:30:00+01:00'))).toBe(true)
    // Onsdag 00:30 — tisdagens happy hour, som inte finns
    expect(isHappyHourActive(late, wed('00:30'))).toBe(false)
  })

  it('kräver pris och tider', () => {
    expect(isHappyHourActive({ ...hhBar, happy_hour_price: null }, wed('16:00'))).toBe(false)
    expect(isHappyHourActive({ ...hhBar, happy_hour_end: null }, wed('16:00'))).toBe(false)
  })
})

describe('prisnormalisering', () => {
  it('tolkar och formaterar storlek', () => {
    expect(parseSize('50cl')).toBe(50)
    expect(parseSize('33 cl')).toBe(33)
    expect(parseSize('')).toBeNull()
    expect(formatSize('50cl')).toBe('50 cl')
  })

  it('räknar 50 cl × 0,8 till 40 cl', () => {
    expect(toComparable(35, '50cl')).toBe(28)
    expect(toComparable(39, '40cl')).toBe(39)
    expect(toComparable(30, '33cl')).toBe(36.36)
  })

  it('jämför 50 cl-pris mot 40 cl-pris men visar originalet', () => {
    const only50 = { ...base, price_50cl: 35 }
    expect(getCurrentPrice(only50, wed('12:00'))).toEqual({ price: 35, size: '50cl', isHappyHour: false })
    expect(getComparablePrice(only50, wed('12:00'))).toBe(28)
  })

  it('väljer den storlek som är billigast per 40 cl', () => {
    const both = { ...base, price_40cl: 32, price_50cl: 38 } // 38 × 0,8 = 30,4
    expect(getCurrentPrice(both, wed('12:00'))).toMatchObject({ price: 38, size: '50cl' })
    expect(getComparablePrice(both, wed('12:00'))).toBe(30.4)
  })

  it('använder happy hour-pris och -storlek när happy hour är aktiv', () => {
    const bar = { ...hhBar, happy_hour_size: '50cl' }
    expect(getCurrentPrice(bar, wed('16:00'))).toEqual({ price: 30, size: '50cl', isHappyHour: true })
    expect(getComparablePrice(bar, wed('16:00'))).toBe(24)
    expect(getComparablePrice(bar, wed('19:00'))).toBe(45)
  })

  it('antar 40 cl för happy hour utan storlek', () => {
    expect(getCurrentPrice(hhBar, wed('16:00')).size).toBe('40cl')
  })

  it('returnerar null utan pris', () => {
    expect(getComparablePrice(base, wed('12:00'))).toBeNull()
  })
})

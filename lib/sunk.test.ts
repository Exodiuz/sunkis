import { describe, expect, it } from 'vitest'
import { getSunkLabel } from './sunk'

describe('getSunkLabel', () => {
  it('ger ord för varje nivå', () => {
    expect(getSunkLabel(1)).toBe('Fint')
    expect(getSunkLabel(3)).toBe('Lagom sunkigt')
    expect(getSunkLabel(5)).toBe('Äkta hak')
  })

  it('avrundar snittet till närmaste nivå', () => {
    expect(getSunkLabel(3.4)).toBe('Lagom sunkigt')
    expect(getSunkLabel(3.5)).toBe('Sunkigt')
    expect(getSunkLabel(4.6)).toBe('Äkta hak')
  })

  it('returnerar null utan röster', () => {
    expect(getSunkLabel(0)).toBeNull()
    expect(getSunkLabel(null)).toBeNull()
  })
})

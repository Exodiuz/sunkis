import { describe, expect, it } from 'vitest'
import { canVoteAgain, isAlreadyVoted } from './votes'

describe('isAlreadyVoted', () => {
  it('känner igen databasens felkod', () => {
    expect(isAlreadyVoted({ code: 'SK001' })).toBe(true)
    expect(isAlreadyVoted({ code: '22023' })).toBe(false)
    expect(isAlreadyVoted(null)).toBe(false)
  })
})

describe('canVoteAgain', () => {
  const now = Date.parse('2026-10-28T12:00:00Z')
  it('tillåter röst utan tidigare röst eller efter 24 h', () => {
    expect(canVoteAgain(null, now)).toBe(true)
    expect(canVoteAgain({ score: 3, at: now - 24 * 3600_000 }, now)).toBe(true)
  })
  it('spärrar inom 24 h', () => {
    expect(canVoteAgain({ score: 3, at: now - 23 * 3600_000 }, now)).toBe(false)
  })
})

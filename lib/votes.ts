// Hjälpare för röstningen (vote_price / vote_sunk)

// Felkod från databasen när enheten redan röstat på baren senaste 24 h (C3)
export const ALREADY_VOTED_CODE = 'SK001'

export function isAlreadyVoted(error: { code?: string } | null): boolean {
  return error?.code === ALREADY_VOTED_CODE
}

// Användarens egen sunkröst per bar sparas lokalt så att den kan visas igen (B1)
const OWN_SUNK_KEY = (barId: string) => `sunkis:sunk-vote:${barId}`
const DAY_MS = 24 * 60 * 60 * 1000

export type OwnVote = { score: number; at: number }

export function readOwnSunkVote(barId: string): OwnVote | null {
  try {
    const raw = localStorage.getItem(OWN_SUNK_KEY(barId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as OwnVote
    return typeof parsed.score === 'number' && typeof parsed.at === 'number' ? parsed : null
  } catch {
    return null
  }
}

export function saveOwnSunkVote(barId: string, score: number, now = Date.now()) {
  try {
    localStorage.setItem(OWN_SUNK_KEY(barId), JSON.stringify({ score, at: now }))
  } catch {
    // Lagring blockerad — rösten är ändå sparad i databasen
  }
}

// Får enheten rösta igen? Speglar databasens spärr på 24 h (C3)
export function canVoteAgain(vote: OwnVote | null, now = Date.now()): boolean {
  return !vote || now - vote.at >= DAY_MS
}

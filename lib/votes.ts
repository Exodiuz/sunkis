// Hjälpare för röstningen (vote_price / vote_sunk)

// Felkod från databasen när enheten redan röstat på baren senaste 24 h (C3)
export const ALREADY_VOTED_CODE = 'SK001'

export function isAlreadyVoted(error: { code?: string } | null): boolean {
  return error?.code === ALREADY_VOTED_CODE
}

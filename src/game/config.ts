import type { LoseFaces } from './types'

/** Each game picks one of these at random: the number of losing faces out of 6. */
export const LOSE_FACE_OPTIONS: LoseFaces[] = [2, 3, 4]

/**
 * Credit bonus on a win, in percent of the bet. Tuned by simulation so that a whole game ends with about
 * 150% of everyone's buy-ins in total (averaged over 2 and 4 players and several betting styles; range
 * roughly 115–185%), after pool wipes, bankruptcies and eliminated players' losses vanish.
 * Each option adds about the same per roll: (win chance) × bonus ≈ 93% of the bet.
 */
export const RATE_PERCENT: Record<LoseFaces, number> = { 2: 140, 3: 185, 4: 280 }

export const MIN_BET = 20
/** Caps a single bet so winnings can't be re-bet to grow exponentially. */
export const MAX_BET = 100

export const INITIAL_COINS = 1000
/** Max credits a player can bring into one game (inflation control). */
export const MAX_BUY_IN = 100
export const MIN_BUY_IN = MIN_BET
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6
export const TURN_SECONDS = 60
export const DEFAULT_STREAK = 3
export const MIN_STREAK = 1
export const MAX_STREAK = 10
export const PASS_ROUNDS_TO_END = 2
/** This many losses in a row (by anyone in the room) wipe out the pool. */
export const LOSSES_TO_WIPE_POOL = 3
/** This many of one player's own losses in a row bankrupt them. */
export const LOSSES_TO_BANKRUPT = 3

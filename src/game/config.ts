import type { LoseFaces } from './types'

/** Each game picks one of these at random: the number of losing faces out of 6. */
export const LOSE_FACE_OPTIONS: LoseFaces[] = [2, 3, 4]

/**
 * Credit bonus on a win, in percent of the bet. A lost bet goes to the pool and usually comes back to some
 * player, so counting the pool, one roll returns 100% + (win chance) × bonus = 200% across all players.
 * (Bets lost by eliminated players vanish when a game ends without a streak winner.)
 */
export const RATE_PERCENT: Record<LoseFaces, number> = { 2: 150, 3: 200, 4: 300 }

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

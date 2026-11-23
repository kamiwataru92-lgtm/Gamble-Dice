import type { LoseFaces } from './types'

/** Credit increase rate on a win, by number of losing faces (out of 6). */
export const RATES: Record<LoseFaces, number> = { 1: 0.1, 2: 0.2, 3: 0.4, 4: 0.6, 5: 0.9 }

export const INITIAL_COINS = 1000
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6
export const TURN_SECONDS = 60
export const DEFAULT_STREAK = 3
export const MIN_STREAK = 1
export const MAX_STREAK = 10
export const PASS_ROUNDS_TO_END = 2

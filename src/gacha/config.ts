import type { Rarity } from './types'

/** Lowest to highest. */
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'superRare', 'epic', 'legendary', 'mythic']

export const RARITY_RATES: Record<Rarity, number> = {
  common: 0.6335,
  uncommon: 0.25,
  rare: 0.1,
  superRare: 0.01,
  epic: 0.005,
  legendary: 0.001,
  mythic: 0.0005,
}

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'コモン',
  uncommon: 'アンコモン',
  rare: 'レア',
  superRare: 'スーパーレア',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
}

export const PRICES = { 1: 1000, 9: 8000 } as const

/** 9-pull: the last slot is at least this rarity if the first 8 were all below it. */
export const NINE_PULL_GUARANTEE: Rarity = 'rare'

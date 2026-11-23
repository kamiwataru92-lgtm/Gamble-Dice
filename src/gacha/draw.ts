import { GameError } from '../game/engine'
import { ITEMS } from './catalog'
import { NINE_PULL_GUARANTEE, PRICES, RARITIES, RARITY_RATES } from './config'
import type { Item, Rarity } from './types'

const rank = (r: Rarity) => RARITIES.indexOf(r)

/** Pick a rarity by the configured rates, considering only `minRarity` and above. */
export function rollRarity(rng: () => number, minRarity: Rarity = 'common'): Rarity {
  const pool = RARITIES.filter((r) => rank(r) >= rank(minRarity))
  const total = pool.reduce((s, r) => s + RARITY_RATES[r], 0)
  let x = rng() * total
  for (const r of pool) {
    x -= RARITY_RATES[r]
    if (x < 0) return r
  }
  return pool[pool.length - 1]
}

/** Pick an item of `rarity`, or of the nearest lower rarity that has items. */
function pickItem(rarity: Rarity, rng: () => number, items: Item[]): Item {
  for (let i = rank(rarity); i >= 0; i--) {
    const candidates = items.filter((it) => it.rarity === RARITIES[i])
    if (candidates.length) return candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))]
  }
  throw new Error('catalog has no items')
}

export function drawItems(count: 1 | 9, rng: () => number, items: Item[] = ITEMS): Item[] {
  const drawn: Item[] = []
  for (let n = 0; n < count; n++) {
    const guaranteed =
      count === 9 && n === 8 && drawn.every((i) => rank(i.rarity) < rank(NINE_PULL_GUARANTEE))
    drawn.push(pickItem(rollRarity(rng, guaranteed ? NINE_PULL_GUARANTEE : 'common'), rng, items))
  }
  return drawn
}

export interface Wallet {
  coins: number
  items: Record<string, number>
}

export function purchase(
  wallet: Wallet,
  count: 1 | 9,
  rng: () => number,
  items: Item[] = ITEMS,
): Wallet & { drawn: Item[] } {
  const price = PRICES[count]
  if (wallet.coins < price) throw new GameError('insufficient_coins')
  const drawn = drawItems(count, rng, items)
  const owned = { ...wallet.items }
  for (const i of drawn) owned[i.id] = (owned[i.id] ?? 0) + 1
  return { coins: wallet.coins - price, items: owned, drawn }
}

export function setIcon(owned: Record<string, number>, itemId: string | null): string | null {
  if (itemId !== null && !(owned[itemId] > 0)) throw new GameError('not_owned')
  return itemId
}

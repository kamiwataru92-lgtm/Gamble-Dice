import { itemById } from '../gacha/catalog'
import { GameError } from '../game/engine'

export const MAX_GIVE_COUNT = 999

/** New coin balance after an admin adjustment. `delta` is a non-zero integer. */
export function adjustCoins(coins: number, delta: number): number {
  if (!Number.isInteger(delta) || delta === 0) throw new GameError('invalid_amount')
  const next = coins + delta
  if (next < 0) throw new GameError('negative_coins')
  return next
}

/** New item counts after giving `count` of `itemId`. */
export function giveItem(owned: Record<string, number>, itemId: string, count: number): Record<string, number> {
  if (!itemById(itemId)) throw new GameError('unknown_item')
  if (!Number.isInteger(count) || count < 1 || count > MAX_GIVE_COUNT) throw new GameError('invalid_amount')
  return { ...owned, [itemId]: (owned[itemId] ?? 0) + count }
}

/** True when the SHA-256 of `password` equals `expectedHex`. */
export async function isAdminPassword(password: string, expectedHex: string): Promise<boolean> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === expectedHex
}

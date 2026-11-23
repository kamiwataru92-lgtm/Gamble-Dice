import { RATES } from './config'
import type { ForfeitMode, LoseFaces } from './types'

export function winAmount(bet: number, loseFaces: LoseFaces): number {
  return Math.floor(bet * RATES[loseFaces])
}

export function forfeitAmount(mode: ForfeitMode, bet: number, credits: number): number {
  return mode === 'bet' ? bet : Math.max(1, Math.floor(credits / 2))
}

/** Faces 1..loseFaces lose; the rest win. */
export function isWin(face: number, loseFaces: LoseFaces): boolean {
  return face > loseFaces
}

/**
 * Split the pool in proportion to what each player forfeited.
 * Shares are floored; the remainder goes to the biggest loser (earliest in order on ties).
 * `forfeited` must be in turn order.
 */
export function splitPool(
  pool: number,
  forfeited: { uid: string; amount: number }[],
): Record<string, number> {
  const payouts: Record<string, number> = {}
  const total = forfeited.reduce((s, f) => s + f.amount, 0)
  for (const f of forfeited) payouts[f.uid] = total > 0 ? Math.floor((pool * f.amount) / total) : 0
  if (total === 0) return payouts
  const remainder = pool - Object.values(payouts).reduce((s, v) => s + v, 0)
  const top = forfeited.reduce((best, f) => (f.amount > best.amount ? f : best))
  payouts[top.uid] += remainder
  return payouts
}

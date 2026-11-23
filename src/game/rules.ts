import { RATE_PERCENT } from './config'
import type { LoseFaces } from './types'

export function winAmount(bet: number, loseFaces: LoseFaces): number {
  return Math.floor((bet * RATE_PERCENT[loseFaces]) / 100)
}


/** Faces 1..loseFaces lose; the rest win. */
export function isWin(face: number, loseFaces: LoseFaces): boolean {
  return face > loseFaces
}

import { describe, expect, it } from 'vitest'
import { LOSE_FACE_OPTIONS, RATE_PERCENT } from '../src/game/config'
import { isWin, winAmount } from '../src/game/rules'

describe('winAmount', () => {
  it('pays the bonus on a win, floored', () => {
    expect(winAmount(100, 2)).toBe(150)
    expect(winAmount(100, 3)).toBe(200)
    expect(winAmount(100, 4)).toBe(300)
    expect(winAmount(25, 2)).toBe(37) // floor(37.5)
  })
  it('returns 200% per roll across all players, counting the pool', () => {
    // A lost bet goes to the pool and comes back to some player, so only wins create credits:
    // total return per roll = 100% + (win chance) × (bonus %).
    for (const f of LOSE_FACE_OPTIONS) {
      const winChance = (6 - f) / 6
      const total = 100 + winChance * RATE_PERCENT[f]
      expect(total).toBeCloseTo(200, 5)
    }
  })
})

describe('isWin', () => {
  it('loses when the face is one of the losing faces', () => {
    expect(isWin(3, 2)).toBe(true)
    expect(isWin(2, 2)).toBe(false)
    expect(isWin(5, 4)).toBe(true)
    expect(isWin(4, 4)).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { LOSE_FACE_OPTIONS, RATE_PERCENT } from '../src/game/config'
import { isWin, winAmount } from '../src/game/rules'

describe('winAmount', () => {
  it('pays the bonus on a win, floored', () => {
    expect(winAmount(100, 2)).toBe(140)
    expect(winAmount(100, 3)).toBe(185)
    expect(winAmount(100, 4)).toBe(280)
    expect(winAmount(50, 3)).toBe(92) // floor(92.5)
  })
  it('adds about the same per roll whichever odds the game picked', () => {
    // A lost bet goes to the pool and comes back to some player, so only wins create credits:
    // total return per roll = 100% + (win chance) × (bonus %).
    for (const f of LOSE_FACE_OPTIONS) {
      const winChance = (6 - f) / 6
      const total = 100 + winChance * RATE_PERCENT[f]
      expect(total).toBeGreaterThan(192)
      expect(total).toBeLessThan(194)
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

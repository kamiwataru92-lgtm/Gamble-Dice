import { describe, expect, it } from 'vitest'
import { LOSE_FACE_OPTIONS, RATE_PERCENT } from '../src/game/config'
import { isWin, splitPool, winAmount } from '../src/game/rules'

describe('winAmount', () => {
  it('pays so that a roll returns about 105% on average, floored', () => {
    expect(winAmount(100, 2)).toBe(58)
    expect(winAmount(100, 3)).toBe(110)
    expect(winAmount(100, 4)).toBe(215)
    expect(winAmount(25, 2)).toBe(14) // floor(14.5)
  })
  it('keeps the expected return slightly above 100% (about 105%) for every option', () => {
    for (const f of LOSE_FACE_OPTIONS) {
      const winChance = (6 - f) / 6
      const expected = winChance * (100 + RATE_PERCENT[f])
      expect(expected).toBeGreaterThan(104.5)
      expect(expected).toBeLessThan(105.5)
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

describe('splitPool', () => {
  it('splits by forfeited share and gives the remainder to the biggest loser', () => {
    expect(splitPool(100, [{ uid: 'a', amount: 1 }, { uid: 'b', amount: 2 }])).toEqual({ a: 33, b: 67 })
  })
  it('breaks remainder ties by turn order', () => {
    expect(
      splitPool(10, [{ uid: 'a', amount: 3 }, { uid: 'b', amount: 3 }, { uid: 'c', amount: 3 }]),
    ).toEqual({ a: 4, b: 3, c: 3 })
  })
  it('returns zeros for an empty pool', () => {
    expect(splitPool(0, [{ uid: 'a', amount: 0 }])).toEqual({ a: 0 })
  })
  it('returns zeros when nobody forfeited anything', () => {
    expect(splitPool(50, [{ uid: 'a', amount: 0 }, { uid: 'b', amount: 0 }])).toEqual({ a: 0, b: 0 })
  })
})

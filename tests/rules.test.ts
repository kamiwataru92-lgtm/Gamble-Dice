import { describe, expect, it } from 'vitest'
import { forfeitAmount, isWin, splitPool, winAmount } from '../src/game/rules'

describe('winAmount', () => {
  it('applies the rate for the number of losing faces, floored', () => {
    expect(winAmount(100, 1)).toBe(10)
    expect(winAmount(100, 2)).toBe(20)
    expect(winAmount(100, 3)).toBe(40)
    expect(winAmount(100, 4)).toBe(60)
    expect(winAmount(100, 5)).toBe(90)
    expect(winAmount(15, 3)).toBe(6)
  })
})

describe('forfeitAmount', () => {
  it('takes the bet in bet mode', () => {
    expect(forfeitAmount('bet', 30, 100)).toBe(30)
  })
  it('takes half the credits, floored, in half mode', () => {
    expect(forfeitAmount('half', 30, 101)).toBe(50)
  })
  it('takes at least 1 in half mode', () => {
    expect(forfeitAmount('half', 30, 1)).toBe(1)
  })
})

describe('isWin', () => {
  it('loses when the face is one of the losing faces', () => {
    expect(isWin(2, 1)).toBe(true)
    expect(isWin(1, 1)).toBe(false)
    expect(isWin(6, 5)).toBe(true)
    expect(isWin(5, 5)).toBe(false)
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

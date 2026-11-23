import { describe, expect, it } from 'vitest'
import { adjustCoins, giveItem } from '../src/admin/ops'
import { ITEMS } from '../src/gacha/catalog'
import { GameError } from '../src/game/engine'

function expectError(fn: () => unknown, code: string) {
  try {
    fn()
  } catch (e) {
    expect(e).toBeInstanceOf(GameError)
    expect((e as GameError).code).toBe(code)
    return
  }
  throw new Error(`expected GameError ${code}`)
}

describe('adjustCoins', () => {
  it('adds and subtracts', () => {
    expect(adjustCoins(1000, 500)).toBe(1500)
    expect(adjustCoins(1000, -1000)).toBe(0)
  })
  it('rejects going below zero', () => {
    expectError(() => adjustCoins(100, -101), 'negative_coins')
  })
  it.each([0, 1.5, NaN, Infinity])('rejects delta %s', (delta) => {
    expectError(() => adjustCoins(100, delta), 'invalid_amount')
  })
})

describe('giveItem', () => {
  const id = ITEMS[0].id
  it('adds to the count without changing the input', () => {
    const owned = { [id]: 2 }
    expect(giveItem(owned, id, 3)).toEqual({ [id]: 5 })
    expect(owned).toEqual({ [id]: 2 })
  })
  it('works for items the player does not have yet', () => {
    expect(giveItem({}, id, 1)).toEqual({ [id]: 1 })
  })
  it('rejects unknown items', () => {
    expectError(() => giveItem({}, 'no-such-item', 1), 'unknown_item')
  })
  it.each([0, -1, 1.5, 1000])('rejects count %s', (count) => {
    expectError(() => giveItem({}, id, count), 'invalid_amount')
  })
})

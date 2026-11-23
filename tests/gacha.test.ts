import { describe, expect, it } from 'vitest'
import { ITEMS } from '../src/gacha/catalog'
import { PRICES, RARITIES } from '../src/gacha/config'
import { drawItems, purchase, rollRarity, setIcon } from '../src/gacha/draw'
import type { Item } from '../src/gacha/types'
import { GameError } from '../src/game/engine'

const always = (v: number) => () => v
const rank = (r: Item['rarity']) => RARITIES.indexOf(r)

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

describe('rollRarity', () => {
  it('maps rng onto the cumulative rates', () => {
    expect(rollRarity(always(0))).toBe('common')
    expect(rollRarity(always(0.6334))).toBe('common')
    expect(rollRarity(always(0.6336))).toBe('uncommon')
    expect(rollRarity(always(0.8836))).toBe('rare')
    expect(rollRarity(always(0.9840))).toBe('superRare')
    expect(rollRarity(always(0.9940))).toBe('epic')
    expect(rollRarity(always(0.9990))).toBe('legendary')
    expect(rollRarity(always(0.99999))).toBe('mythic')
  })
  it('never goes below minRarity', () => {
    for (const v of [0, 0.3, 0.9, 0.99999]) expect(rank(rollRarity(always(v), 'rare'))).toBeGreaterThanOrEqual(rank('rare'))
  })
})

describe('drawItems', () => {
  it('draws the requested number of items', () => {
    expect(drawItems(1, Math.random)).toHaveLength(1)
    expect(drawItems(9, Math.random)).toHaveLength(9)
  })
  it('guarantees rare or better in the 9th slot of a 9-pull when the first 8 miss', () => {
    const drawn = drawItems(9, always(0))
    expect(drawn.slice(0, 8).every((i) => i.rarity === 'common')).toBe(true)
    expect(rank(drawn[8].rarity)).toBeGreaterThanOrEqual(rank('rare'))
  })
  it('does not force the 9th slot when rare or better already came out', () => {
    let n = 0
    const rng = () => (n++ === 0 ? 0.9 : 0) // first rarity roll is rare, everything else common
    const drawn = drawItems(9, rng)
    expect(drawn[0].rarity).toBe('rare')
    expect(drawn[8].rarity).toBe('common')
  })
  it('falls back to the next lower rarity that has items', () => {
    const items: Item[] = [
      { id: 'c', rarity: 'common', name: 'c', emoji: 'c' },
      { id: 's', rarity: 'superRare', name: 's', emoji: 's' },
    ]
    expect(drawItems(1, always(0.995), items)[0].id).toBe('s') // epic → superRare
    expect(drawItems(1, always(0.9), items)[0].id).toBe('c') // rare → common
  })
})

describe('purchase', () => {
  it('charges the price and adds the drawn items', () => {
    const r = purchase({ coins: 9000, items: { [ITEMS[0].id]: 2 } }, 9, always(0))
    expect(r.coins).toBe(9000 - PRICES[9])
    expect(r.drawn).toHaveLength(9)
    const total = Object.values(r.items).reduce((s, n) => s + n, 0)
    expect(total).toBe(2 + 9)
  })
  it('costs 1000 for a single pull', () => {
    expect(purchase({ coins: 1000, items: {} }, 1, always(0)).coins).toBe(0)
  })
  it('rejects a purchase without enough coins and changes nothing', () => {
    const wallet = { coins: 7999, items: {} }
    expectError(() => purchase(wallet, 9, always(0)), 'insufficient_coins')
    expect(wallet).toEqual({ coins: 7999, items: {} })
  })
})

describe('setIcon', () => {
  it('allows an owned item or clearing the icon', () => {
    expect(setIcon({ a: 1 }, 'a')).toBe('a')
    expect(setIcon({}, null)).toBeNull()
  })
  it('rejects an item you do not own', () => {
    expectError(() => setIcon({ a: 0 }, 'a'), 'not_owned')
    expectError(() => setIcon({}, 'b'), 'not_owned')
  })
})

describe('catalog', () => {
  it('has unique ids', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length)
  })
  it('only gives BGM to super rare and above', () => {
    for (const i of ITEMS) if (i.bgm) expect(rank(i.rarity)).toBeGreaterThanOrEqual(rank('superRare'))
  })
  it('has items for common through super rare', () => {
    for (const r of ['common', 'uncommon', 'rare', 'superRare'] as const) {
      expect(ITEMS.some((i) => i.rarity === r)).toBe(true)
    }
  })
})

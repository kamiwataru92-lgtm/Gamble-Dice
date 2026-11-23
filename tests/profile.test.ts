import { describe, expect, it } from 'vitest'
import { GameError } from '../src/game/engine'
import { normalizeName } from '../src/game/profile'

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

describe('normalizeName', () => {
  it('trims surrounding spaces, including full-width ones', () => {
    expect(normalizeName('  たろう　')).toBe('たろう')
  })
  it('accepts up to 12 characters, counting emoji as one', () => {
    expect(normalizeName('あいうえおかきくけこさし')).toBe('あいうえおかきくけこさし')
    expect(normalizeName('🎲🎲🎲🎲🎲🎲🎲🎲🎲🎲🎲🎲')).toBe('🎲🎲🎲🎲🎲🎲🎲🎲🎲🎲🎲🎲')
  })
  it.each(['', '   ', 'あいうえおかきくけこさしす', 'a\nb', 'a\tb'])('rejects %j', (name) => {
    expectError(() => normalizeName(name), 'invalid_name')
  })
})

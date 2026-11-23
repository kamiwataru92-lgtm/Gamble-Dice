import { describe, expect, it } from 'vitest'
import { friendRequestId, normalizeHandle } from '../src/game/friends'
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

describe('normalizeHandle', () => {
  it('lowercases and trims', () => {
    expect(normalizeHandle('  Taro_01 ')).toBe('taro_01')
  })
  it('accepts 3 to 16 characters', () => {
    expect(normalizeHandle('abc')).toBe('abc')
    expect(normalizeHandle('a'.repeat(16))).toBe('a'.repeat(16))
  })
  it.each(['ab', 'a'.repeat(17), 'taro-01', 'たろう', 'ta ro', '', 'Ａbc'])('rejects %j', (raw) => {
    expectError(() => normalizeHandle(raw), 'invalid_handle')
  })
})

describe('friendRequestId', () => {
  it('is from_to so each direction has one request', () => {
    expect(friendRequestId('u1', 'u2')).toBe('u1_u2')
  })
  it('rejects requesting yourself', () => {
    expectError(() => friendRequestId('u1', 'u1'), 'self_request')
  })
})

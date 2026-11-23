import { describe, expect, it } from 'vitest'
import { generateRoomCode } from '../src/game/roomCode'

function seq(values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

describe('generateRoomCode', () => {
  it('is 6 characters without confusable 0, O, 1, I', () => {
    for (let n = 0; n < 200; n++) {
      const code = generateRoomCode(Math.random)
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    }
  })
  it('is deterministic for the same rng sequence', () => {
    expect(generateRoomCode(seq([0.1, 0.5, 0.9]))).toBe(generateRoomCode(seq([0.1, 0.5, 0.9])))
  })
})

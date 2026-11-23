import { describe, expect, it } from 'vitest'
import { GameError } from '../src/game/engine'
import { addPlayer, createState, removePlayer, settlePlayer } from '../src/game/lobby'
import type { GameState } from '../src/game/types'

const host = { uid: 'h', displayName: 'Host' }
const settings = { forfeitMode: 'bet' as const, streakToWin: 3 }

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

describe('createState', () => {
  it('creates a waiting room with the host bought in', () => {
    const s = createState(host, settings, 80, 1000)
    expect(s.status).toBe('waiting')
    expect(s.hostUid).toBe('h')
    expect(s.players.h).toEqual({
      uid: 'h', displayName: 'Host', credits: 80, buyIn: 80, forfeitedTotal: 0, eliminated: false, settled: false,
    })
  })
  it.each([0, -1, 1.5, 101])('rejects buy-in %s', (buyIn) => {
    expectError(() => createState(host, settings, buyIn, 1000), 'invalid_buyin')
  })
  it('accepts the maximum buy-in of 100', () => {
    expect(createState(host, settings, 100, 1000).players.h.credits).toBe(100)
  })
  it('rejects buying in more coins than you have', () => {
    expectError(() => createState(host, settings, 50, 40), 'insufficient_coins')
  })
  it.each([0, 11, 2.5])('rejects streak %s', (streakToWin) => {
    expectError(() => createState(host, { ...settings, streakToWin }, 100, 1000), 'invalid_settings')
  })
})

describe('addPlayer', () => {
  const room = () => createState(host, settings, 100, 1000)
  it('adds a bought-in player', () => {
    const s = addPlayer(room(), { uid: 'p', displayName: 'P' }, 50, 60)
    expect(s.players.p.credits).toBe(50)
  })
  it('rejects buying in more than you have', () => {
    expectError(() => addPlayer(room(), { uid: 'p', displayName: 'P' }, 61, 60), 'insufficient_coins')
  })
  it('rejects a buy-in over 100 when joining', () => {
    expectError(() => addPlayer(room(), { uid: 'p', displayName: 'P' }, 101, 500), 'invalid_buyin')
  })
  it('rejects a full room', () => {
    let s = room()
    for (const u of ['a', 'b', 'c', 'd', 'e']) s = addPlayer(s, { uid: u, displayName: u }, 1, 10)
    expectError(() => addPlayer(s, { uid: 'f', displayName: 'f' }, 1, 10), 'room_full')
  })
  it('rejects joining after the game started', () => {
    expectError(() => addPlayer({ ...room(), status: 'playing' }, { uid: 'p', displayName: 'P' }, 1, 10), 'already_started')
  })
  it('rejects joining twice', () => {
    expectError(() => addPlayer(room(), host, 1, 10), 'already_joined')
  })
})

describe('settlePlayer', () => {
  const finished = (): GameState => ({ ...createState(host, settings, 100, 1000), status: 'finished' })
  it('returns the credits to cash out and marks the player settled', () => {
    const { state, coins } = settlePlayer(finished(), 'h')
    expect(coins).toBe(100)
    expect(state.players.h.settled).toBe(true)
  })
  it('pays nothing the second time', () => {
    const once = settlePlayer(finished(), 'h').state
    expect(settlePlayer(once, 'h').coins).toBe(0)
  })
  it('rejects settling an unfinished game', () => {
    expectError(() => settlePlayer(createState(host, settings, 100, 1000), 'h'), 'not_finished')
  })
})

describe('removePlayer', () => {
  const room = () => addPlayer(createState(host, settings, 100, 1000), { uid: 'p', displayName: 'P' }, 40, 100)
  it('removes a non-host from a waiting room and refunds the buy-in', () => {
    const { state, refund } = removePlayer(room(), 'p')
    expect(state.players.p).toBeUndefined()
    expect(refund).toBe(40)
  })
  it('does not let the host leave (the host cancels instead)', () => {
    expectError(() => removePlayer(room(), 'h'), 'host_cannot_leave')
  })
  it('rejects leaving after the game started', () => {
    expectError(() => removePlayer({ ...room(), status: 'playing' }, 'p'), 'already_started')
  })
  it('rejects someone who is not in the room', () => {
    expectError(() => removePlayer(room(), 'x'), 'not_in_room')
  })
})

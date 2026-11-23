import { describe, expect, it } from 'vitest'
import { GameError } from '../src/game/engine'
import { addPlayer, createState, nextRound, removePlayer, settlePlayer } from '../src/game/lobby'
import type { GameState } from '../src/game/types'

const host = { uid: 'h', displayName: 'Host', icon: 'moai' }
const settings = { streakToWin: 3 }

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
  it('creates a waiting room with the creator bought in', () => {
    const s = createState(host, settings, 80, 1000)
    expect(s.status).toBe('waiting')
    expect(s.round).toBe(1)
    expect(s.loseFaces).toBeNull()
    expect(s.players.h).toEqual({
      uid: 'h', displayName: 'Host', icon: 'moai', credits: 80, buyIn: 80, forfeitedTotal: 0, eliminated: false, settled: false,
    })
  })
  it.each([0, 19, 1.5, 101])('rejects buy-in %s (20 to 100)', (buyIn) => {
    expectError(() => createState(host, settings, buyIn, 1000), 'invalid_buyin')
  })
  it('accepts buy-ins of 20 and 100', () => {
    expect(createState(host, settings, 20, 1000).players.h.credits).toBe(20)
    expect(createState(host, settings, 100, 1000).players.h.credits).toBe(100)
  })
  it('rejects buying in more coins than you have', () => {
    expectError(() => createState(host, settings, 50, 40), 'insufficient_coins')
  })
  it.each([0, 11, 2.5])('rejects streak %s', (streakToWin) => {
    expectError(() => createState(host, { streakToWin }, 100, 1000), 'invalid_settings')
  })
})

describe('addPlayer', () => {
  const room = () => createState(host, settings, 100, 1000)
  it('adds a bought-in player with their icon', () => {
    const s = addPlayer(room(), { uid: 'p', displayName: 'P', icon: 'skull' }, 50, 60)
    expect(s.players.p.credits).toBe(50)
    expect(s.players.p.icon).toBe('skull')
  })
  it('rejects buying in more than you have, or over 100', () => {
    expectError(() => addPlayer(room(), { uid: 'p', displayName: 'P' }, 61, 60), 'insufficient_coins')
    expectError(() => addPlayer(room(), { uid: 'p', displayName: 'P' }, 101, 500), 'invalid_buyin')
  })
  it('rejects a full room', () => {
    let s = room()
    for (const u of ['a', 'b', 'c', 'd', 'e']) s = addPlayer(s, { uid: u, displayName: u }, 20, 100)
    expectError(() => addPlayer(s, { uid: 'f', displayName: 'f' }, 20, 100), 'room_full')
  })
  it('rejects joining while a game is in progress', () => {
    expectError(() => addPlayer({ ...room(), status: 'playing' }, { uid: 'p', displayName: 'P' }, 20, 100), 'already_started')
  })
  it('rejects joining twice', () => {
    expectError(() => addPlayer(room(), host, 20, 100), 'already_joined')
  })
})

describe('removePlayer', () => {
  const room = () => addPlayer(createState(host, settings, 100, 1000), { uid: 'p', displayName: 'P' }, 40, 100)
  it('lets anyone, including the creator, leave before the game and refunds the buy-in', () => {
    expect(removePlayer(room(), 'p')).toMatchObject({ refund: 40 })
    const { state, refund } = removePlayer(room(), 'h')
    expect(refund).toBe(100)
    expect(state.players.h).toBeUndefined()
  })
  it('rejects leaving during a game', () => {
    expectError(() => removePlayer({ ...room(), status: 'playing' }, 'p'), 'already_started')
  })
  it('rejects someone who is not in the game', () => {
    expectError(() => removePlayer(room(), 'x'), 'not_in_room')
  })
})

function finished(): GameState {
  const s = addPlayer(createState(host, settings, 100, 1000), { uid: 'p', displayName: 'P' }, 40, 100)
  return { ...s, status: 'finished', loseFaces: 3, players: { ...s.players, h: { ...s.players.h, credits: 150 } } }
}

describe('settlePlayer', () => {
  it('returns the credits to cash out and marks the player settled', () => {
    const { state, coins } = settlePlayer(finished(), 'h')
    expect(coins).toBe(150)
    expect(state.players.h.settled).toBe(true)
  })
  it('pays nothing the second time', () => {
    expect(settlePlayer(settlePlayer(finished(), 'h').state, 'h').coins).toBe(0)
  })
  it('pays credits carried over from an earlier game after the room moved on', () => {
    const next = nextRound(finished())
    const { state, coins } = settlePlayer(next, 'h')
    expect(coins).toBe(150)
    expect(state.unsettled.h).toBeUndefined()
    expect(settlePlayer(state, 'h').coins).toBe(0)
  })
  it('pays nothing during a game when nothing is owed', () => {
    expect(settlePlayer({ ...finished(), status: 'playing' }, 'h').coins).toBe(0)
  })
})

describe('nextRound', () => {
  it('reopens the room for buy-ins and keeps the settings', () => {
    const s = nextRound(finished())
    expect(s.status).toBe('waiting')
    expect(s.round).toBe(2)
    expect(s.players).toEqual({})
    expect(s.settings).toEqual(settings)
    expect(s.loseFaces).toBeNull()
    expect(s.pool).toBe(0)
    expect(s.result).toBeNull()
  })
  it('keeps what unsettled players are owed, but not settled ones', () => {
    const once = settlePlayer(finished(), 'h').state
    expect(nextRound(once).unsettled).toEqual({ p: 40 })
  })
  it('only works after a game finished', () => {
    expectError(() => nextRound({ ...finished(), status: 'playing' }), 'not_finished')
  })
})

describe('rooms saved by the previous version', () => {
  it('can move on to the next game even without round / unsettled fields', () => {
    const legacy = { ...finished(), round: undefined, unsettled: undefined, settings: { streakToWin: 3, forfeitMode: 'bet' } } as unknown as GameState
    const s = nextRound(legacy)
    expect(s.round).toBe(2)
    expect(s.settings).toEqual({ streakToWin: 3 })
    expect(s.unsettled).toEqual({ h: 150, p: 40 })
  })
})

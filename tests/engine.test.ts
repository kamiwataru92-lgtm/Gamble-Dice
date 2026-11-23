import { describe, expect, it } from 'vitest'
import { applyAction, GameError, startGame } from '../src/game/engine'
import type { GameState, PlayerState } from '../src/game/types'

const NOW = 1_000_000
/** rng that makes the next die show `face` (1..6). */
const face = (f: number) => () => (f - 1) / 6 + 0.01
const WIN = face(6)
const LOSE = face(1)

function player(uid: string, credits = 100): PlayerState {
  return { uid, displayName: uid, icon: null, credits, buyIn: credits, forfeitedTotal: 0, eliminated: false, settled: false }
}

function playing(overrides: Partial<GameState> = {}, uids = ['a', 'b', 'c']): GameState {
  return {
    status: 'playing',
    hostUid: uids[0],
    settings: { forfeitMode: 'bet', streakToWin: 3 },
    players: Object.fromEntries(uids.map((u) => [u, player(u)])),
    turnOrder: uids,
    currentTurnIndex: 0,
    currentStreak: 0,
    rolledThisTurn: false,
    consecutivePasses: 0,
    pool: 0,
    turnDeadline: NOW + 60_000,
    lastRoll: null,
    result: null,
    ...overrides,
  }
}

const roll = (uid: string, bet = 10, loseFaces: 1 | 2 | 3 | 4 | 5 = 1) =>
  ({ type: 'roll', uid, bet, loseFaces }) as const
const pass = (uid: string) => ({ type: 'pass', uid }) as const
const current = (s: GameState) => s.turnOrder[s.currentTurnIndex]

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

describe('startGame', () => {
  it('orders every player and starts playing', () => {
    const waiting = playing({ status: 'waiting', turnOrder: [] })
    const s = startGame(waiting, Math.random, NOW)
    expect(s.status).toBe('playing')
    expect([...s.turnOrder].sort()).toEqual(['a', 'b', 'c'])
    expect(s.currentTurnIndex).toBe(0)
    expect(s.turnDeadline).toBe(NOW + 60_000)
  })
  it('rejects fewer than 2 players', () => {
    expectError(() => startGame(playing({ status: 'waiting' }, ['a']), Math.random, NOW), 'not_enough_players')
  })
})

describe('rolling', () => {
  it('adds the win amount and keeps the turn on a win', () => {
    const s = applyAction(playing(), roll('a', 50, 5), WIN, NOW)
    expect(s.players.a.credits).toBe(145)
    expect(current(s)).toBe('a')
    expect(s.currentStreak).toBe(1)
    expect(s.lastRoll).toEqual({ uid: 'a', bet: 50, loseFaces: 5, face: 6, win: true, delta: 45 })
  })
  it('restarts the turn timer after a win', () => {
    const s = applyAction(playing(), roll('a'), WIN, NOW + 50_000)
    expect(s.turnDeadline).toBe(NOW + 50_000 + 60_000)
  })
  it('moves the bet to the pool and ends the turn on a loss in bet mode', () => {
    const s = applyAction(playing(), roll('a', 30), LOSE, NOW)
    expect(s.players.a.credits).toBe(70)
    expect(s.players.a.forfeitedTotal).toBe(30)
    expect(s.pool).toBe(30)
    expect(current(s)).toBe('b')
    expect(s.currentStreak).toBe(0)
    expect(s.turnDeadline).toBe(NOW + 60_000)
  })
  it('takes half the credits on a loss in half mode', () => {
    const s = applyAction(playing({ settings: { forfeitMode: 'half', streakToWin: 3 } }), roll('a', 1), LOSE, NOW)
    expect(s.players.a.credits).toBe(50)
    expect(s.pool).toBe(50)
  })
  it('eliminates a player who hits 0 in half mode and skips them afterwards', () => {
    const base = playing({ settings: { forfeitMode: 'half', streakToWin: 3 } })
    base.players.a.credits = 1
    let s = applyAction(base, roll('a', 1), LOSE, NOW)
    expect(s.players.a.credits).toBe(0)
    expect(s.players.a.eliminated).toBe(true)
    s = applyAction(s, roll('b'), LOSE, NOW)
    s = applyAction(s, roll('c'), LOSE, NOW)
    expect(current(s)).toBe('b')
  })
  it('wins the whole pool after the required streak and ends the game', () => {
    let s = playing({ pool: 200 })
    s = applyAction(s, roll('a', 10), WIN, NOW)
    s = applyAction(s, roll('a', 10), WIN, NOW)
    expect(s.status).toBe('playing')
    s = applyAction(s, roll('a', 10), WIN, NOW)
    expect(s.status).toBe('finished')
    expect(s.result).toEqual({ reason: 'streak', winnerUid: 'a', payouts: { a: 200, b: 0, c: 0 } })
    expect(s.players.a.credits).toBe(303)
  })
  it('resets the streak when the player passes', () => {
    let s = applyAction(playing(), roll('a'), WIN, NOW)
    s = applyAction(s, pass('a'), WIN, NOW)
    expect(s.currentStreak).toBe(0)
    expect(current(s)).toBe('b')
  })
})

describe('passing', () => {
  it('does not count a pass after rolling as a no-roll pass', () => {
    let s = applyAction(playing(), roll('a'), WIN, NOW)
    s = applyAction(s, pass('a'), WIN, NOW)
    expect(s.consecutivePasses).toBe(0)
  })
  it('ends with allPass after two full rounds of no-roll passes, split by forfeits', () => {
    let s = playing()
    s = applyAction(s, roll('a', 10), LOSE, NOW) // a forfeits 10
    s = applyAction(s, roll('b', 30), LOSE, NOW) // b forfeits 30
    for (let i = 0; i < 5; i++) s = applyAction(s, pass(current(s)), WIN, NOW)
    expect(s.status).toBe('playing')
    s = applyAction(s, pass(current(s)), WIN, NOW)
    expect(s.status).toBe('finished')
    expect(s.result).toEqual({ reason: 'allPass', payouts: { a: 10, b: 30, c: 0 } })
  })
  it('resets the pass count when someone rolls', () => {
    let s = applyAction(playing(), pass('a'), WIN, NOW)
    s = applyAction(s, pass('b'), WIN, NOW)
    expect(s.consecutivePasses).toBe(2)
    s = applyAction(s, roll('c'), LOSE, NOW)
    expect(s.consecutivePasses).toBe(0)
  })
  it('ends with allPass when everyone is eliminated', () => {
    let s = playing({}, ['a', 'b'])
    s = applyAction(s, roll('a', 100), LOSE, NOW)
    s = applyAction(s, roll('b', 100), LOSE, NOW)
    expect(s.status).toBe('finished')
    expect(s.result).toEqual({ reason: 'allPass', payouts: { a: 100, b: 100 } })
  })
})

describe('timeout', () => {
  it('passes for the current player once the deadline has passed', () => {
    const s = applyAction(playing(), { type: 'timeout', now: NOW + 60_000 }, WIN, NOW + 60_000)
    expect(current(s)).toBe('b')
    expect(s.consecutivePasses).toBe(1)
  })
  it('is rejected before the deadline', () => {
    expectError(() => applyAction(playing(), { type: 'timeout', now: NOW }, WIN, NOW), 'not_expired')
  })
})

describe('invalid actions', () => {
  it('rejects a player acting out of turn', () => {
    expectError(() => applyAction(playing(), roll('b'), WIN, NOW), 'not_your_turn')
    expectError(() => applyAction(playing(), pass('b'), WIN, NOW), 'not_your_turn')
  })
  it.each([0, -5, 2.5, 101, NaN])('rejects bet %s', (bet) => {
    expectError(() => applyAction(playing(), roll('a', bet), WIN, NOW), 'invalid_bet')
  })
  it.each([0, 6, 2.5])('rejects %s losing faces', (faces) => {
    expectError(() => applyAction(playing(), roll('a', 10, faces as 1), WIN, NOW), 'invalid_faces')
  })
  it('rejects actions after the game finished', () => {
    expectError(() => applyAction(playing({ status: 'finished' }), roll('a'), WIN, NOW), 'not_playing')
  })
  it('does not mutate the input state', () => {
    const s = playing()
    const before = JSON.stringify(s)
    applyAction(s, roll('a'), LOSE, NOW)
    expect(JSON.stringify(s)).toBe(before)
  })
})

describe('final credits', () => {
  it('include the allPass payouts so settlement can just cash out credits', () => {
    let s = playing()
    s = applyAction(s, roll('a', 10), LOSE, NOW)
    for (let i = 0; i < 6; i++) s = applyAction(s, pass(current(s)), WIN, NOW)
    expect(s.players.a.credits).toBe(100)
    expect(s.pool).toBe(0)
  })
})

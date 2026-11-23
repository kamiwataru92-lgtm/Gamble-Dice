import { describe, expect, it } from 'vitest'
import { applyAction, GameError, startGame } from '../src/game/engine'
import type { GameState, LoseFaces, PlayerState } from '../src/game/types'

const NOW = 1_000_000
/** rng that makes the next die show `face` (1..6). */
const face = (f: number) => () => (f - 1) / 6 + 0.01
const WIN = face(6)
const LOSE = face(1)

function player(uid: string, credits = 100): PlayerState {
  return { uid, displayName: uid, icon: null, credits, buyIn: credits, forfeitedTotal: 0, eliminated: false, settled: false }
}

function playing(overrides: Partial<GameState> = {}, uids = ['a', 'b', 'c'], loseFaces: LoseFaces = 3): GameState {
  return {
    status: 'playing',
    round: 1,
    settings: { streakToWin: 3 },
    loseFaces,
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
    unsettled: {},
    ...overrides,
  }
}

const roll = (uid: string, bet = 20) => ({ type: 'roll', uid, bet }) as const
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
  const waiting = () => playing({ status: 'waiting', turnOrder: [], loseFaces: null })
  it('orders every player and starts playing', () => {
    const s = startGame(waiting(), Math.random, NOW)
    expect(s.status).toBe('playing')
    expect([...s.turnOrder].sort()).toEqual(['a', 'b', 'c'])
    expect(s.turnDeadline).toBe(NOW + 60_000)
  })
  it('picks the losing odds for the whole game from 2/6, 3/6 or 4/6', () => {
    expect(startGame(waiting(), () => 0, NOW).loseFaces).toBe(2)
    expect(startGame(waiting(), () => 0.5, NOW).loseFaces).toBe(3)
    expect(startGame(waiting(), () => 0.99, NOW).loseFaces).toBe(4)
  })
  it('rejects fewer than 2 players', () => {
    expectError(() => startGame(playing({ status: 'waiting' }, ['a']), Math.random, NOW), 'not_enough_players')
  })
})

describe('rolling', () => {
  it('uses the game\'s odds: 3/6 pays +110%', () => {
    const s = applyAction(playing(), roll('a', 50), WIN, NOW)
    expect(s.players.a.credits).toBe(155)
    expect(current(s)).toBe('a')
    expect(s.currentStreak).toBe(1)
    expect(s.lastRoll).toEqual({ uid: 'a', bet: 50, face: 6, win: true, delta: 55 })
  })
  it('uses the game\'s odds: face 3 loses at 3/6 but wins at 2/6', () => {
    expect(applyAction(playing({}, undefined, 3), roll('a'), face(3), NOW).lastRoll?.win).toBe(false)
    expect(applyAction(playing({}, undefined, 2), roll('a'), face(3), NOW).lastRoll?.win).toBe(true)
  })
  it('restarts the turn timer after a win', () => {
    const s = applyAction(playing(), roll('a'), WIN, NOW + 50_000)
    expect(s.turnDeadline).toBe(NOW + 50_000 + 60_000)
  })
  it('moves the bet to the pool and ends the turn on a loss', () => {
    const s = applyAction(playing(), roll('a', 30), LOSE, NOW)
    expect(s.players.a.credits).toBe(70)
    expect(s.players.a.forfeitedTotal).toBe(30)
    expect(s.pool).toBe(30)
    expect(current(s)).toBe('b')
    expect(s.currentStreak).toBe(0)
  })
  it('eliminates a player left with less than the minimum bet and skips them', () => {
    let s = applyAction(playing(), roll('a', 85), LOSE, NOW)
    expect(s.players.a.credits).toBe(15)
    expect(s.players.a.eliminated).toBe(true)
    s = applyAction(s, roll('b'), LOSE, NOW)
    s = applyAction(s, roll('c'), LOSE, NOW)
    expect(current(s)).toBe('b')
  })
  it('wins the whole pool after the required streak and ends the game', () => {
    let s = playing({ pool: 200 })
    for (let i = 0; i < 3; i++) s = applyAction(s, roll('a', 20), WIN, NOW)
    expect(s.status).toBe('finished')
    expect(s.result).toEqual({ reason: 'streak', winnerUid: 'a', payouts: { a: 200, b: 0, c: 0 } })
    expect(s.players.a.credits).toBe(100 + 22 + 22 + 22 + 200)
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
    s = applyAction(s, roll('a', 20), LOSE, NOW)
    s = applyAction(s, roll('b', 60), LOSE, NOW)
    for (let i = 0; i < 5; i++) s = applyAction(s, pass(current(s)), WIN, NOW)
    expect(s.status).toBe('playing')
    s = applyAction(s, pass(current(s)), WIN, NOW)
    expect(s.status).toBe('finished')
    expect(s.result).toEqual({ reason: 'allPass', payouts: { a: 20, b: 60, c: 0 } })
    expect(s.players.a.credits).toBe(100)
  })
  it('resets the pass count when someone rolls', () => {
    let s = applyAction(playing(), pass('a'), WIN, NOW)
    s = applyAction(s, pass('b'), WIN, NOW)
    expect(s.consecutivePasses).toBe(2)
    s = applyAction(s, roll('c'), LOSE, NOW)
    expect(s.consecutivePasses).toBe(0)
  })
  it('ends when only one player is left, splitting the pool by forfeits', () => {
    let s = playing({}, ['a', 'b'])
    s = applyAction(s, roll('a', 30), WIN, NOW) // a wins once (+33)
    s = applyAction(s, pass('a'), WIN, NOW)
    s = applyAction(s, roll('b', 90), LOSE, NOW) // b: 10 left → eliminated, a is alone
    expect(s.status).toBe('finished')
    expect(s.result).toEqual({ reason: 'lastOne', payouts: { a: 0, b: 90 } })
    expect(s.players.a.credits).toBe(133)
    expect(s.players.b.credits).toBe(100)
  })
  it('keeps going while two or more players are left', () => {
    const s = applyAction(playing(), roll('a', 85), LOSE, NOW)
    expect(s.players.a.eliminated).toBe(true)
    expect(s.status).toBe('playing')
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
  it.each([0, 19, -5, 20.5, 101, NaN])('rejects bet %s (20 to 100)', (bet) => {
    expectError(() => applyAction(playing(), roll('a', bet), WIN, NOW), 'invalid_bet')
  })
  it('rejects a bet over 100 even with more credits', () => {
    const rich = playing()
    rich.players.a.credits = 500
    expectError(() => applyAction(rich, roll('a', 101), WIN, NOW), 'invalid_bet')
    expect(applyAction(rich, roll('a', 100), WIN, NOW).players.a.credits).toBe(610)
  })
  it('accepts the minimum bet of 20', () => {
    expect(applyAction(playing(), roll('a', 20), WIN, NOW).players.a.credits).toBe(122)
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

describe('games saved by the previous version', () => {
  it('play at 3/6 when no odds were picked', () => {
    const s = applyAction(playing({ loseFaces: null }), roll('a', 50), WIN, NOW)
    expect(s.players.a.credits).toBe(155)
  })
})

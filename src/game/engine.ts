import { LOSE_FACE_OPTIONS, MIN_BET, MIN_PLAYERS, PASS_ROUNDS_TO_END, TURN_SECONDS } from './config'
import { isWin, splitPool, winAmount } from './rules'
import type { Action, GameState } from './types'

export class GameError extends Error {
  constructor(public code: string) {
    super(code)
    this.name = 'GameError'
  }
}

const clone = (s: GameState): GameState => structuredClone(s)
const deadline = (now: number) => now + TURN_SECONDS * 1000

export function startGame(state: GameState, rng: () => number, now: number): GameState {
  if (state.status !== 'waiting') throw new GameError('already_started')
  const uids = Object.keys(state.players)
  if (uids.length < MIN_PLAYERS) throw new GameError('not_enough_players')
  const loseFaces = LOSE_FACE_OPTIONS[Math.min(LOSE_FACE_OPTIONS.length - 1, Math.floor(rng() * LOSE_FACE_OPTIONS.length))]
  for (let i = uids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[uids[i], uids[j]] = [uids[j], uids[i]]
  }
  return {
    ...clone(state),
    status: 'playing',
    loseFaces,
    turnOrder: uids,
    currentTurnIndex: 0,
    currentStreak: 0,
    rolledThisTurn: false,
    consecutivePasses: 0,
    turnDeadline: deadline(now),
  }
}

export function applyAction(state: GameState, action: Action, rng: () => number, now: number): GameState {
  if (state.status !== 'playing') throw new GameError('not_playing')
  const s = clone(state)
  const uid = s.turnOrder[s.currentTurnIndex]

  if (action.type === 'timeout') {
    if (action.now < s.turnDeadline) throw new GameError('not_expired')
    return pass(s, now)
  }
  if (action.uid !== uid) throw new GameError('not_your_turn')
  if (action.type === 'pass') return pass(s, now)

  const p = s.players[uid]
  const { bet } = action
  // Games started before odds were picked per game have no loseFaces: treat them as 3/6.
  const loseFaces = s.loseFaces ?? 3
  if (!Number.isInteger(bet) || bet < MIN_BET || bet > p.credits) throw new GameError('invalid_bet')

  const face = Math.floor(rng() * 6) + 1
  s.consecutivePasses = 0
  if (isWin(face, loseFaces)) {
    const delta = winAmount(bet, loseFaces)
    p.credits += delta
    s.lastRoll = { uid, bet, face, win: true, delta }
    s.currentStreak += 1
    s.rolledThisTurn = true
    s.turnDeadline = deadline(now)
    if (s.currentStreak >= s.settings.streakToWin) {
      const payouts = Object.fromEntries(s.turnOrder.map((u) => [u, u === uid ? s.pool : 0]))
      p.credits += s.pool
      s.pool = 0
      s.status = 'finished'
      s.result = { reason: 'streak', winnerUid: uid, payouts }
    }
    return s
  }

  p.credits -= bet
  p.forfeitedTotal += bet
  s.pool += bet
  // Can no longer place the minimum bet: out of this game (what is left is cashed out at the end).
  if (p.credits < MIN_BET) p.eliminated = true
  s.lastRoll = { uid, bet, face, win: false, delta: -bet }
  return endTurn(s, now)
}

function pass(s: GameState, now: number): GameState {
  if (!s.rolledThisTurn) s.consecutivePasses += 1
  return endTurn(s, now)
}

function endTurn(s: GameState, now: number): GameState {
  s.currentStreak = 0
  s.rolledThisTurn = false
  const active = s.turnOrder.filter((u) => !s.players[u].eliminated)
  if (active.length === 0 || s.consecutivePasses >= PASS_ROUNDS_TO_END * active.length) {
    return finishAllPass(s)
  }
  let i = s.currentTurnIndex
  do i = (i + 1) % s.turnOrder.length
  while (s.players[s.turnOrder[i]].eliminated)
  s.currentTurnIndex = i
  s.turnDeadline = deadline(now)
  return s
}

function finishAllPass(s: GameState): GameState {
  const payouts = splitPool(
    s.pool,
    s.turnOrder.map((u) => ({ uid: u, amount: s.players[u].forfeitedTotal })),
  )
  for (const u of s.turnOrder) s.players[u].credits += payouts[u]
  s.pool = 0
  s.status = 'finished'
  s.result = { reason: 'allPass', payouts }
  return s
}

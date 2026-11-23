import { MIN_PLAYERS, PASS_ROUNDS_TO_END, TURN_SECONDS } from './config'
import { forfeitAmount, isWin, splitPool, winAmount } from './rules'
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
  for (let i = uids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[uids[i], uids[j]] = [uids[j], uids[i]]
  }
  return {
    ...clone(state),
    status: 'playing',
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
  const { bet, loseFaces } = action
  if (!Number.isInteger(bet) || bet < 1 || bet > p.credits) throw new GameError('invalid_bet')
  if (!Number.isInteger(loseFaces) || loseFaces < 1 || loseFaces > 5) throw new GameError('invalid_faces')

  const face = Math.floor(rng() * 6) + 1
  s.consecutivePasses = 0
  if (isWin(face, loseFaces)) {
    const delta = winAmount(bet, loseFaces)
    p.credits += delta
    s.lastRoll = { uid, bet, loseFaces, face, win: true, delta }
    s.currentStreak += 1
    s.rolledThisTurn = true
    if (s.currentStreak >= s.settings.streakToWin) {
      const payouts = Object.fromEntries(s.turnOrder.map((u) => [u, u === uid ? s.pool : 0]))
      p.credits += s.pool
      s.pool = 0
      s.status = 'finished'
      s.result = { reason: 'streak', winnerUid: uid, payouts }
    }
    return s
  }

  const lost = Math.min(p.credits, forfeitAmount(s.settings.forfeitMode, bet, p.credits))
  p.credits -= lost
  p.forfeitedTotal += lost
  s.pool += lost
  if (p.credits === 0) p.eliminated = true
  s.lastRoll = { uid, bet, loseFaces, face, win: false, delta: -lost }
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

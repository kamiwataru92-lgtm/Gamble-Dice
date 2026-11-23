import { LOSE_FACE_OPTIONS, LOSSES_TO_WIPE_POOL, MAX_BET, MIN_BET, MIN_PLAYERS, PASS_ROUNDS_TO_END, TURN_SECONDS } from './config'
import { isWin, winAmount } from './rules'
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
    lossStreak: 0,
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
  if (!Number.isInteger(bet) || bet < MIN_BET || bet > MAX_BET || bet > p.credits) throw new GameError('invalid_bet')

  const face = Math.floor(rng() * 6) + 1
  s.consecutivePasses = 0
  if (isWin(face, loseFaces)) {
    const delta = winAmount(bet, loseFaces)
    p.credits += delta
    s.lastRoll = { uid, bet, face, win: true, delta, wipedPool: 0 }
    // Streaks count every roll in the room, whoever rolls; passes don't break them.
    s.currentStreak += 1
    s.lossStreak = 0
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
  // Can no longer place the minimum bet: out of this game, and whatever is left goes to the pool too.
  if (p.credits < MIN_BET) {
    s.pool += p.credits
    p.credits = 0
    p.eliminated = true
  }
  s.currentStreak = 0
  s.lossStreak = (s.lossStreak ?? 0) + 1
  let wipedPool = 0
  if (s.lossStreak >= LOSSES_TO_WIPE_POOL) {
    // Too many losses in a row: the pool is gone, and nothing in it can be refunded later.
    wipedPool = s.pool
    s.pool = 0
    s.lossStreak = 0
    for (const q of Object.values(s.players)) q.forfeitedTotal = 0
  }
  s.lastRoll = { uid, bet, face, win: false, delta: -bet, wipedPool }
  return endTurn(s, now)
}

function pass(s: GameState, now: number): GameState {
  if (!s.rolledThisTurn) s.consecutivePasses += 1
  return endTurn(s, now)
}

function endTurn(s: GameState, now: number): GameState {
  s.rolledThisTurn = false
  const active = s.turnOrder.filter((u) => !s.players[u].eliminated)
  // Only one player (or nobody) left: stop, so a lone survivor can't keep rolling.
  if (active.length <= 1) return finishSplit(s, 'lastOne')
  if (s.consecutivePasses >= PASS_ROUNDS_TO_END * active.length) return finishSplit(s, 'allPass')
  let i = s.currentTurnIndex
  do i = (i + 1) % s.turnOrder.length
  while (s.players[s.turnOrder[i]].eliminated)
  s.currentTurnIndex = i
  s.turnDeadline = deadline(now)
  return s
}

/**
 * End without a streak winner: each surviving player gets back what they lost to the pool; eliminated
 * players get nothing, and whatever they lost disappears.
 */
function finishSplit(s: GameState, reason: 'allPass' | 'lastOne'): GameState {
  const payouts: Record<string, number> = {}
  for (const u of s.turnOrder) {
    const p = s.players[u]
    payouts[u] = p.eliminated ? 0 : p.forfeitedTotal
    p.credits += payouts[u]
  }
  s.pool = 0
  s.status = 'finished'
  s.result = { reason, payouts }
  return s
}

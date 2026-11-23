import { MAX_BUY_IN, MAX_PLAYERS, MAX_STREAK, MIN_BUY_IN, MIN_STREAK } from './config'
import { GameError } from './engine'
import type { GameSettings, GameState, PlayerState } from './types'

interface User {
  uid: string
  displayName: string
  icon?: string | null
}

function checkBuyIn(buyIn: number, coins: number) {
  if (!Number.isInteger(buyIn) || buyIn < MIN_BUY_IN || buyIn > MAX_BUY_IN) throw new GameError('invalid_buyin')
  if (buyIn > coins) throw new GameError('insufficient_coins')
}

const newPlayer = (u: User, buyIn: number): PlayerState => ({
  uid: u.uid, displayName: u.displayName, icon: u.icon ?? null, credits: buyIn, buyIn, forfeitedTotal: 0, eliminated: false, settled: false,
})

function freshGame(settings: GameSettings, round: number, unsettled: Record<string, number>): GameState {
  return {
    status: 'waiting',
    round,
    settings,
    loseFaces: null,
    players: {},
    turnOrder: [],
    currentTurnIndex: 0,
    currentStreak: 0,
    rolledThisTurn: false,
    consecutivePasses: 0,
    pool: 0,
    turnDeadline: 0,
    lastRoll: null,
    result: null,
    unsettled,
  }
}

export function createState(creator: User, settings: GameSettings, buyIn: number, coins: number): GameState {
  const { streakToWin } = settings
  if (!Number.isInteger(streakToWin) || streakToWin < MIN_STREAK || streakToWin > MAX_STREAK) {
    throw new GameError('invalid_settings')
  }
  checkBuyIn(buyIn, coins)
  return { ...freshGame({ streakToWin }, 1, {}), players: { [creator.uid]: newPlayer(creator, buyIn) } }
}

export function addPlayer(state: GameState, user: User, buyIn: number, coins: number): GameState {
  if (state.status !== 'waiting') throw new GameError('already_started')
  if (state.players[user.uid]) throw new GameError('already_joined')
  if (Object.keys(state.players).length >= MAX_PLAYERS) throw new GameError('room_full')
  checkBuyIn(buyIn, coins)
  return { ...state, players: { ...state.players, [user.uid]: newPlayer(user, buyIn) } }
}

/** Anyone leaves the next game before it starts and gets their buy-in back. */
export function removePlayer(state: GameState, uid: string): { state: GameState; refund: number } {
  if (state.status !== 'waiting') throw new GameError('already_started')
  const p = state.players[uid]
  if (!p) throw new GameError('not_in_room')
  const players = { ...state.players }
  delete players[uid]
  return { state: { ...state, players }, refund: p.buyIn }
}

/**
 * Cash out what this player is owed exactly once: their final credits when the game has finished,
 * plus anything carried over from an earlier game in this room. A second call pays 0.
 */
export function settlePlayer(state: GameState, uid: string): { state: GameState; coins: number } {
  let coins = 0
  let next = state
  const owed = state.unsettled?.[uid]
  if (owed !== undefined) {
    const unsettled = { ...state.unsettled }
    delete unsettled[uid]
    next = { ...next, unsettled }
    coins += owed
  }
  const p = state.players[uid]
  if (state.status === 'finished' && p && !p.settled) {
    next = { ...next, players: { ...next.players, [uid]: { ...p, settled: true } } }
    coins += p.credits
  }
  return { state: next, coins }
}

/** After a game ends, reopen the same room for the next game. Unpaid credits are kept in `unsettled`. */
export function nextRound(state: GameState): GameState {
  if (state.status !== 'finished') throw new GameError('not_finished')
  const unsettled = { ...(state.unsettled ?? {}) }
  for (const p of Object.values(state.players)) {
    if (!p.settled) unsettled[p.uid] = (unsettled[p.uid] ?? 0) + p.credits
  }
  return freshGame({ streakToWin: state.settings.streakToWin }, (state.round ?? 1) + 1, unsettled)
}

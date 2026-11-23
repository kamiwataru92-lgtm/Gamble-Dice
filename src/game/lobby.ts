import { MAX_BUY_IN, MAX_PLAYERS, MAX_STREAK, MIN_STREAK } from './config'
import { GameError } from './engine'
import type { GameSettings, GameState } from './types'

interface User {
  uid: string
  displayName: string
}

function checkBuyIn(buyIn: number, coins: number) {
  if (!Number.isInteger(buyIn) || buyIn < 1 || buyIn > MAX_BUY_IN) throw new GameError('invalid_buyin')
  if (buyIn > coins) throw new GameError('insufficient_coins')
}

const newPlayer = (u: User, buyIn: number) => ({
  uid: u.uid, displayName: u.displayName, credits: buyIn, buyIn, forfeitedTotal: 0, eliminated: false, settled: false,
})

export function createState(host: User, settings: GameSettings, buyIn: number, coins: number): GameState {
  const { forfeitMode, streakToWin } = settings
  if ((forfeitMode !== 'bet' && forfeitMode !== 'half')
    || !Number.isInteger(streakToWin) || streakToWin < MIN_STREAK || streakToWin > MAX_STREAK) {
    throw new GameError('invalid_settings')
  }
  checkBuyIn(buyIn, coins)
  return {
    status: 'waiting',
    hostUid: host.uid,
    settings: { forfeitMode, streakToWin },
    players: { [host.uid]: newPlayer(host, buyIn) },
    turnOrder: [],
    currentTurnIndex: 0,
    currentStreak: 0,
    rolledThisTurn: false,
    consecutivePasses: 0,
    pool: 0,
    turnDeadline: 0,
    lastRoll: null,
    result: null,
  }
}

export function addPlayer(state: GameState, user: User, buyIn: number, coins: number): GameState {
  if (state.status !== 'waiting') throw new GameError('already_started')
  if (state.players[user.uid]) throw new GameError('already_joined')
  if (Object.keys(state.players).length >= MAX_PLAYERS) throw new GameError('room_full')
  checkBuyIn(buyIn, coins)
  return { ...state, players: { ...state.players, [user.uid]: newPlayer(user, buyIn) } }
}

/** Cash a player's final credits out once. A second call pays 0. */
export function settlePlayer(state: GameState, uid: string): { state: GameState; coins: number } {
  if (state.status !== 'finished') throw new GameError('not_finished')
  const p = state.players[uid]
  if (!p || p.settled) return { state, coins: 0 }
  return {
    state: { ...state, players: { ...state.players, [uid]: { ...p, settled: true } } },
    coins: p.credits,
  }
}

/** A non-host leaves a room that has not started and gets their buy-in back. */
export function removePlayer(state: GameState, uid: string): { state: GameState; refund: number } {
  if (state.status !== 'waiting') throw new GameError('already_started')
  const p = state.players[uid]
  if (!p) throw new GameError('not_in_room')
  if (uid === state.hostUid) throw new GameError('host_cannot_leave')
  const players = { ...state.players }
  delete players[uid]
  return { state: { ...state, players }, refund: p.buyIn }
}

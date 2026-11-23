import { arrayRemove, arrayUnion, doc, getDoc, onSnapshot, runTransaction } from 'firebase/firestore'
import { applyAction, GameError, startGame } from '../game/engine'
import { addPlayer, createState, nextRound, removePlayer, settlePlayer } from '../game/lobby'
import { generateRoomCode } from '../game/roomCode'
import type { Action, GameSettings, GameState } from '../game/types'
import { db } from './app'
import { userRef, type UserDoc } from './wallet'

interface User {
  uid: string
  displayName: string
  icon?: string | null
}

const roomRef = (code: string) => doc(db, 'rooms', code)

async function coinsOf(tx: Parameters<Parameters<typeof runTransaction>[1]>[0], uid: string) {
  const snap = await tx.get(userRef(uid))
  if (!snap.exists()) throw new GameError('no_user')
  return (snap.data() as UserDoc).coins
}

export async function createRoom(host: User, settings: GameSettings, buyIn: number): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode(Math.random)
    const created = await runTransaction(db, async (tx) => {
      if ((await tx.get(roomRef(code))).exists()) return false
      const coins = await coinsOf(tx, host.uid)
      tx.set(roomRef(code), createState(host, settings, buyIn, coins))
      tx.update(userRef(host.uid), { coins: coins - buyIn, openRooms: arrayUnion(code) })
      return true
    })
    if (created) return code
  }
  throw new GameError('code_collision')
}

export async function joinRoom(code: string, user: User, buyIn: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code))
    if (!snap.exists()) throw new GameError('not_found')
    const coins = await coinsOf(tx, user.uid)
    tx.set(roomRef(code), addPlayer(snap.data() as GameState, user, buyIn, coins))
    tx.update(userRef(user.uid), { coins: coins - buyIn, openRooms: arrayUnion(code) })
  })
}

async function update(code: string, fn: (s: GameState) => GameState): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code))
    if (!snap.exists()) throw new GameError('not_found')
    tx.set(roomRef(code), fn(snap.data() as GameState))
  })
}

/** Any player who has bought in can start the game. */
export function startRoom(code: string, uid: string): Promise<void> {
  return update(code, (s) => {
    if (!s.players[uid]) throw new GameError('not_in_room')
    return startGame(s, Math.random, Date.now())
  })
}

/** After a game ends, reopen the same room for the next game (anyone who played can do it). */
export function nextGame(code: string): Promise<void> {
  return update(code, (s) => (s.status === 'waiting' ? s : nextRound(s)))
}

export function act(code: string, action: Action): Promise<void> {
  return update(code, (s) => applyAction(s, action, Math.random, Date.now()))
}

export function watchRoom(code: string, cb: (s: GameState | null) => void): () => void {
  return onSnapshot(roomRef(code), (snap) => cb(snap.exists() ? (snap.data() as GameState) : null))
}

/** Cash out whatever this player is owed by the room (final credits, carried-over credits) exactly once. */
export async function settle(code: string, uid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code))
    const coins = await coinsOf(tx, uid)
    if (!snap.exists()) {
      tx.update(userRef(uid), { openRooms: arrayRemove(code) })
      return
    }
    const room = snap.data() as GameState
    const result = settlePlayer(room, uid)
    if (result.state === room) return // nothing owed: no writes
    tx.set(roomRef(code), result.state)
    tx.update(userRef(uid), { coins: coins + result.coins })
  })
}

/**
 * Leave the room for good: refund the buy-in if the next game has not started, cash out anything owed,
 * and stop tracking the room. Not allowed while you are playing in a game.
 */
export async function exitRoom(code: string, uid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code))
    const coins = await coinsOf(tx, uid)
    if (!snap.exists()) {
      tx.update(userRef(uid), { openRooms: arrayRemove(code) })
      return
    }
    const room = snap.data() as GameState
    if (room.status === 'playing' && room.players[uid]) throw new GameError('already_started')
    let state = room
    let gained = 0
    if (room.status === 'waiting' && room.players[uid]) {
      const left = removePlayer(state, uid)
      state = left.state
      gained += left.refund
    }
    const paid = settlePlayer(state, uid)
    state = paid.state
    gained += paid.coins
    if (state !== room) tx.set(roomRef(code), state)
    tx.update(userRef(uid), { coins: coins + gained, openRooms: arrayRemove(code) })
  })
}

/** Cash out every room this user is owed something by (e.g. they were offline when a game ended). */
export async function settlePending(uid: string): Promise<void> {
  const user = await getDoc(userRef(uid))
  for (const code of (user.data() as UserDoc | undefined)?.openRooms ?? []) await settle(code, uid)
}

/** The room this user is in, to go back to it after a reload. */
export async function activeRoom(uid: string): Promise<string | null> {
  const user = await getDoc(userRef(uid))
  for (const code of (user.data() as UserDoc | undefined)?.openRooms ?? []) {
    if ((await getDoc(roomRef(code))).exists()) return code
  }
  return null
}

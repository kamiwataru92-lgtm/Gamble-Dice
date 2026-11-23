import { arrayRemove, arrayUnion, doc, getDoc, onSnapshot, runTransaction } from 'firebase/firestore'
import { applyAction, GameError, startGame } from '../game/engine'
import { addPlayer, createState, removePlayer, settlePlayer } from '../game/lobby'
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

/** A non-host leaves before the game starts: buy-in refunded in the same transaction. */
export async function leaveRoom(code: string, uid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code))
    const coins = await coinsOf(tx, uid)
    if (!snap.exists()) throw new GameError('not_found')
    const { state, refund } = removePlayer(snap.data() as GameState, uid)
    tx.set(roomRef(code), state)
    tx.update(userRef(uid), { coins: coins + refund, openRooms: arrayRemove(code) })
  })
}

async function update(code: string, fn: (s: GameState) => GameState): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code))
    if (!snap.exists()) throw new GameError('not_found')
    tx.set(roomRef(code), fn(snap.data() as GameState))
  })
}

export function startRoom(code: string, uid: string): Promise<void> {
  return update(code, (s) => {
    if (s.hostUid !== uid) throw new GameError('not_host')
    return startGame(s, Math.random, Date.now())
  })
}

/** Host cancels before start: the room finishes with no result and everyone cashes out their buy-in. */
export function cancelRoom(code: string, uid: string): Promise<void> {
  return update(code, (s) => {
    if (s.hostUid !== uid) throw new GameError('not_host')
    if (s.status !== 'waiting') throw new GameError('already_started')
    return { ...s, status: 'finished' }
  })
}

export function act(code: string, action: Action): Promise<void> {
  return update(code, (s) => applyAction(s, action, Math.random, Date.now()))
}

export function watchRoom(code: string, cb: (s: GameState | null) => void): () => void {
  return onSnapshot(roomRef(code), (snap) => cb(snap.exists() ? (snap.data() as GameState) : null))
}

/** Cash out this player's final credits into their wallet exactly once. */
export async function settle(code: string, uid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roomRef(code))
    const coins = await coinsOf(tx, uid)
    if (!snap.exists()) {
      tx.update(userRef(uid), { openRooms: arrayRemove(code) })
      return
    }
    const result = settlePlayer(snap.data() as GameState, uid)
    tx.set(roomRef(code), result.state)
    tx.update(userRef(uid), { coins: coins + result.coins, openRooms: arrayRemove(code) })
  })
}

/** Settle every finished room this user still has open (e.g. they were offline when it ended). */
export async function settlePending(uid: string): Promise<void> {
  const user = await getDoc(userRef(uid))
  for (const code of (user.data() as UserDoc | undefined)?.openRooms ?? []) {
    const room = await getDoc(roomRef(code))
    if (!room.exists() || (room.data() as GameState).status === 'finished') await settle(code, uid)
  }
}

/** Rooms this user is in that are not finished yet, to rejoin after a reload. */
export async function activeRoom(uid: string): Promise<string | null> {
  const user = await getDoc(userRef(uid))
  for (const code of (user.data() as UserDoc | undefined)?.openRooms ?? []) {
    const room = await getDoc(roomRef(code))
    if (room.exists() && (room.data() as GameState).status !== 'finished') return code
  }
  return null
}

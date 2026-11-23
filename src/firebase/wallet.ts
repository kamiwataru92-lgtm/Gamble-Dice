import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { INITIAL_COINS } from '../game/config'
import { purchase, setIcon } from '../gacha/draw'
import type { Item } from '../gacha/types'
import { GameError } from '../game/engine'
import { db } from './app'

/**
 * Shared wallet: `users/{uid}.coins` is game-independent so other games can use the same coins.
 * `openRooms` lists rooms this user bought into and has not been paid out from yet.
 */
export interface UserDoc {
  displayName: string
  coins: number
  openRooms: string[]
  /** Gacha item id → count. Missing on users created before the gacha. */
  items?: Record<string, number>
  /** Equipped gacha item id. */
  icon?: string | null
}

export const userRef = (uid: string) => doc(db, 'users', uid)

/** Create the user with the starting coins on first login. */
export async function ensureUser(uid: string, displayName: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef(uid))
    if (snap.exists()) return
    tx.set(userRef(uid), { displayName, coins: INITIAL_COINS, openRooms: [], createdAt: serverTimestamp() })
  })
}

export function watchUser(uid: string, cb: (user: UserDoc | null) => void): () => void {
  return onSnapshot(userRef(uid), (snap) => cb(snap.exists() ? (snap.data() as UserDoc) : null))
}

/** Pay coins and add the drawn items in one transaction. */
export async function buyGacha(uid: string, count: 1 | 9): Promise<Item[]> {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef(uid))
    if (!snap.exists()) throw new GameError('no_user')
    const user = snap.data() as UserDoc
    const result = purchase({ coins: user.coins, items: user.items ?? {} }, count, Math.random)
    tx.update(userRef(uid), { coins: result.coins, items: result.items })
    return result.drawn
  })
}

export async function equipIcon(uid: string, itemId: string | null): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef(uid))
    if (!snap.exists()) throw new GameError('no_user')
    tx.update(userRef(uid), { icon: setIcon((snap.data() as UserDoc).items ?? {}, itemId) })
  })
}

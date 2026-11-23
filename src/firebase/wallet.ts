import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { INITIAL_COINS } from '../game/config'
import { db } from './app'

/**
 * Shared wallet: `users/{uid}.coins` is game-independent so other games can use the same coins.
 * `openRooms` lists rooms this user bought into and has not been paid out from yet.
 */
export interface UserDoc {
  displayName: string
  coins: number
  openRooms: string[]
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

export function watchCoins(uid: string, cb: (coins: number) => void): () => void {
  return onSnapshot(userRef(uid), (snap) => cb((snap.data() as UserDoc | undefined)?.coins ?? 0))
}

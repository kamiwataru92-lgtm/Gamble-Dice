import { collection, doc, getDocs, runTransaction, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/app'
import type { UserDoc } from '../firebase/wallet'
import { GameError } from '../game/engine'
import { INITIAL_COINS } from '../game/config'
import { adjustCoins, giveItem } from './ops'

export interface Player extends UserDoc {
  uid: string
}

export async function listPlayers(): Promise<Player[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as UserDoc) }))
}

async function updateUser(uid: string, fn: (u: UserDoc) => Partial<UserDoc>): Promise<void> {
  const ref = doc(db, 'users', uid)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new GameError('no_user')
    tx.update(ref, fn(snap.data() as UserDoc))
  })
}

export const changeCoins = (uid: string, delta: number) =>
  updateUser(uid, (u) => ({ coins: adjustCoins(u.coins, delta) }))

export const sendItem = (uid: string, itemId: string, count: number) =>
  updateUser(uid, (u) => ({ items: giveItem(u.items ?? {}, itemId, count) }))

/**
 * Reset every player: coins back to the starting amount, gacha items and icon cleared, and no longer in
 * any room (credits inside rooms are not returned). Names, friend IDs and friends are kept.
 */
export async function resetAllPlayers(): Promise<number> {
  const snap = await getDocs(collection(db, 'users'))
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db)
    for (const d of snap.docs.slice(i, i + 400)) {
      batch.update(d.ref, { coins: INITIAL_COINS, items: {}, icon: null, openRooms: [] })
    }
    await batch.commit()
  }
  return snap.docs.length
}

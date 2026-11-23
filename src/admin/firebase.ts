import { collection, doc, getDocs, runTransaction } from 'firebase/firestore'
import { db } from '../firebase/app'
import type { UserDoc } from '../firebase/wallet'
import { GameError } from '../game/engine'
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

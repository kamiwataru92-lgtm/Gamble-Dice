import { initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { collection, connectFirestoreEmulator, doc, getDocs, getFirestore, runTransaction } from 'firebase/firestore'
import { databaseId, firebaseConfig, usingEmulator } from '../firebase/app'
import type { UserDoc } from '../firebase/wallet'
import { GameError } from '../game/engine'
import { adjustCoins, giveItem } from './ops'

// A separate Firebase app instance so the admin session never mixes with a player's Google session.
const app = initializeApp(firebaseConfig, 'admin')
export const adminAuth = getAuth(app)
const db = getFirestore(app, databaseId)
if (usingEmulator) {
  connectAuthEmulator(adminAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

export const adminSignIn = (email: string, password: string) => signInWithEmailAndPassword(adminAuth, email, password)
export const adminSignOut = () => signOut(adminAuth)
export const watchAdmin = (cb: (u: User | null) => void) => onAuthStateChanged(adminAuth, cb)

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

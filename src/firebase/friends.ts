import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { GameError } from '../game/engine'
import { friendRequestId, normalizeHandle } from '../game/friends'
import type { GameState } from '../game/types'
import { db } from './app'
import { userRef, type UserDoc } from './wallet'

const handleRef = (handle: string) => doc(db, 'handles', handle)
const requestRef = (id: string) => doc(db, 'friendRequests', id)
const roomRef = (code: string) => doc(db, 'rooms', code)

export interface FriendRequest {
  id: string
  from: string
  to: string
  fromName: string
  toName: string
}

export interface Profile {
  uid: string
  displayName: string
  icon: string | null
  handle: string | null
}

const profileOf = (uid: string, u: UserDoc): Profile => ({
  uid, displayName: u.displayName, icon: u.icon ?? null, handle: u.handle ?? null,
})

/** Claim a friend search ID (unique). Changing it frees the old one. */
export async function setHandle(uid: string, raw: string): Promise<void> {
  const handle = normalizeHandle(raw)
  await runTransaction(db, async (tx) => {
    const user = await tx.get(userRef(uid))
    if (!user.exists()) throw new GameError('no_user')
    const old = (user.data() as UserDoc).handle
    if (old === handle) return
    const taken = await tx.get(handleRef(handle))
    if (taken.exists() && taken.data().uid !== uid) throw new GameError('handle_taken')
    tx.set(handleRef(handle), { uid })
    if (old) tx.delete(handleRef(old))
    tx.update(userRef(uid), { handle })
  })
}

export async function findByHandle(raw: string): Promise<Profile | null> {
  const handle = normalizeHandle(raw)
  const h = await getDoc(handleRef(handle))
  if (!h.exists()) return null
  const uid = h.data().uid as string
  const u = await getDoc(userRef(uid))
  return u.exists() ? profileOf(uid, u.data() as UserDoc) : null
}

/** Send a friend request. If they already asked you, this accepts theirs instead. */
export async function sendRequest(me: { uid: string; displayName: string }, to: Profile): Promise<'sent' | 'accepted'> {
  const id = friendRequestId(me.uid, to.uid)
  return runTransaction(db, async (tx) => {
    const mine = await tx.get(userRef(me.uid))
    if (((mine.data() as UserDoc | undefined)?.friends ?? []).includes(to.uid)) throw new GameError('already_friends')
    const reverse = await tx.get(requestRef(friendRequestId(to.uid, me.uid)))
    if (reverse.exists()) {
      tx.update(userRef(me.uid), { friends: arrayUnion(to.uid) })
      tx.update(userRef(to.uid), { friends: arrayUnion(me.uid) })
      tx.delete(reverse.ref)
      return 'accepted'
    }
    tx.set(requestRef(id), { from: me.uid, to: to.uid, fromName: me.displayName, toName: to.displayName, createdAt: serverTimestamp() })
    return 'sent'
  })
}

export async function acceptRequest(req: FriendRequest): Promise<void> {
  await runTransaction(db, async (tx) => {
    const r = await tx.get(requestRef(req.id))
    if (!r.exists()) throw new GameError('request_gone')
    tx.update(userRef(req.to), { friends: arrayUnion(req.from) })
    tx.update(userRef(req.from), { friends: arrayUnion(req.to) })
    tx.delete(r.ref)
  })
}

export const deleteRequest = (id: string) => deleteDoc(requestRef(id))

export async function removeFriend(me: string, other: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    tx.update(userRef(me), { friends: arrayRemove(other) })
    tx.update(userRef(other), { friends: arrayRemove(me) })
  })
}

export function watchRequests(uid: string, cb: (incoming: FriendRequest[], outgoing: FriendRequest[]) => void): () => void {
  let incoming: FriendRequest[] = []
  let outgoing: FriendRequest[] = []
  const toList = (snap: { docs: { id: string; data: () => unknown }[] }) =>
    snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FriendRequest, 'id'>) }))
  const stops = [
    onSnapshot(query(collection(db, 'friendRequests'), where('to', '==', uid)), (s) => { incoming = toList(s); cb(incoming, outgoing) }),
    onSnapshot(query(collection(db, 'friendRequests'), where('from', '==', uid)), (s) => { outgoing = toList(s); cb(incoming, outgoing) }),
  ]
  return () => stops.forEach((f) => f())
}

export interface FriendStatus extends Profile {
  /** Rooms this friend is in, with their current state. */
  rooms: { code: string; room: GameState }[]
}

/** Live view of each friend's profile and the rooms they are in. */
export function watchFriends(uids: string[], cb: (friends: FriendStatus[]) => void): () => void {
  const profiles = new Map<string, { profile: Profile; codes: string[] }>()
  const rooms = new Map<string, GameState>()
  const roomStops = new Map<string, () => void>()
  const emit = () =>
    cb(uids.filter((u) => profiles.has(u)).map((u) => {
      const { profile, codes } = profiles.get(u)!
      return { ...profile, rooms: codes.filter((c) => rooms.has(c)).map((c) => ({ code: c, room: rooms.get(c)! })) }
    }))
  const syncRooms = () => {
    const wanted = new Set([...profiles.values()].flatMap((p) => p.codes))
    for (const [code, stop] of roomStops) if (!wanted.has(code)) { stop(); roomStops.delete(code); rooms.delete(code) }
    for (const code of wanted) {
      if (roomStops.has(code)) continue
      roomStops.set(code, onSnapshot(roomRef(code), (s) => {
        if (s.exists()) rooms.set(code, s.data() as GameState)
        else rooms.delete(code)
        emit()
      }, () => {}))
    }
  }
  const userStops = uids.map((uid) =>
    onSnapshot(userRef(uid), (s) => {
      if (s.exists()) {
        const u = s.data() as UserDoc
        profiles.set(uid, { profile: profileOf(uid, u), codes: u.openRooms ?? [] })
      } else profiles.delete(uid)
      syncRooms()
      emit()
    }, () => {}),
  )
  if (uids.length === 0) cb([])
  return () => {
    userStops.forEach((f) => f())
    roomStops.forEach((f) => f())
  }
}

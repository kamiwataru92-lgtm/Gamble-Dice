import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth, signOut } from '../firebase/app'
import { activeRoom, settlePending, watchRoom } from '../firebase/rooms'
import { ensureUser, watchUser, type UserDoc } from '../firebase/wallet'
import type { GameState } from '../game/types'
import { Collection } from './Collection'
import { GameBoard } from './GameBoard'
import { Gacha } from './Gacha'
import { Lobby } from './Lobby'
import { Login } from './Login'
import { Result } from './Result'
import { WaitingRoom } from './WaitingRoom'

export function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [profile, setProfile] = useState<UserDoc | null>(null)
  const [tab, setTab] = useState<'game' | 'gacha' | 'collection'>('game')
  const [code, setCode] = useState<string | null>(null)
  const [room, setRoom] = useState<GameState | null>(null)

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        if (u) {
          await ensureUser(u.uid, u.displayName ?? 'プレイヤー')
          await settlePending(u.uid)
          setCode(await activeRoom(u.uid))
        }
        setUser(u)
      }),
    [],
  )
  useEffect(() => {
    setProfile(null)
    return user ? watchUser(user.uid, setProfile) : undefined
  }, [user])
  const coins = profile?.coins ?? null
  useEffect(() => {
    setRoom(null)
    return code ? watchRoom(code, setRoom) : undefined
  }, [code])

  // Left the waiting room (or it no longer exists): back to the lobby.
  useEffect(() => {
    if (user && room && room.status === 'waiting' && !room.players[user.uid]) setCode(null)
  }, [user, room])

  if (user === undefined) return <main className="center">読み込み中…</main>
  if (!user) return <Login />

  const me = { uid: user.uid, displayName: user.displayName ?? 'プレイヤー', icon: profile?.icon ?? null }
  let body
  if (!code) {
    body = (
      <>
        <nav className="tabs">
          {(['game', 'gacha', 'collection'] as const).map((t) => (
            <button key={t} className={tab === t ? 'selected' : ''} onClick={() => setTab(t)}>
              {{ game: '🎲 ゲーム', gacha: '🎰 ガチャ', collection: '📦 所持品' }[t]}
            </button>
          ))}
        </nav>
        {tab === 'game' && <Lobby me={me} coins={coins ?? 0} onEnter={setCode} />}
        {tab === 'gacha' && <Gacha uid={me.uid} coins={coins ?? 0} />}
        {tab === 'collection' && <Collection uid={me.uid} items={profile?.items ?? {}} icon={profile?.icon ?? null} />}
      </>
    )
  }
  else if (!room) body = <p className="center">部屋を読み込み中…</p>
  else if (room.status === 'waiting') body = <WaitingRoom code={code} room={room} me={me} />
  else if (room.status === 'playing') body = <GameBoard code={code} room={room} me={me} />
  else body = <Result code={code} room={room} me={me} coins={coins ?? 0} onLeave={() => setCode(null)} />

  return (
    <>
      <header className="bar">
        <strong>Gamble Dice</strong>
        <span>
          🪙 {coins?.toLocaleString() ?? '…'} <button className="link" onClick={signOut}>ログアウト</button>
        </span>
      </header>
      <main>{body}</main>
    </>
  )
}

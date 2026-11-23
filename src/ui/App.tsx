import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth, signOut } from '../firebase/app'
import { activeRoom, settlePending, watchRoom } from '../firebase/rooms'
import { ensureUser, watchCoins } from '../firebase/wallet'
import type { GameState } from '../game/types'
import { GameBoard } from './GameBoard'
import { Lobby } from './Lobby'
import { Login } from './Login'
import { Result } from './Result'
import { WaitingRoom } from './WaitingRoom'

export function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [coins, setCoins] = useState<number | null>(null)
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
    setCoins(null)
    return user ? watchCoins(user.uid, setCoins) : undefined
  }, [user])
  useEffect(() => {
    setRoom(null)
    return code ? watchRoom(code, setRoom) : undefined
  }, [code])

  if (user === undefined) return <main className="center">読み込み中…</main>
  if (!user) return <Login />

  const me = { uid: user.uid, displayName: user.displayName ?? 'プレイヤー' }
  let body
  if (!code) body = <Lobby me={me} coins={coins ?? 0} onEnter={setCode} />
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

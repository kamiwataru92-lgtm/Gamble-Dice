import { useState } from 'react'
import { cancelRoom, leaveRoom, startRoom } from '../firebase/rooms'
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/config'
import type { GameState } from '../game/types'
import { errorMessage } from './messages'

interface Props {
  code: string
  room: GameState
  me: { uid: string }
}

export function WaitingRoom({ code, room, me }: Props) {
  const [error, setError] = useState('')
  const players = Object.values(room.players)
  const isHost = room.hostUid === me.uid
  const run = (p: Promise<void>) => p.catch((e) => setError(errorMessage(e)))

  return (
    <div className="stack">
      <section className="card stack center">
        <small>部屋コード</small>
        <div className="code">{code}</div>
        <button onClick={() => navigator.clipboard?.writeText(code)}>コピー</button>
        <small>
          没収：{room.settings.forfeitMode === 'bet' ? '賭けた額だけ' : 'クレジットの半分'} ／ 連続当たり {room.settings.streakToWin} 回で総取り
        </small>
      </section>
      <section className="card">
        <h2>参加者（{players.length}/{MAX_PLAYERS}）</h2>
        <ul className="list">
          {players.map((p) => (
            <li key={p.uid}>
              {p.displayName}{p.uid === room.hostUid && ' 👑'}<span>{p.credits} cr</span>
            </li>
          ))}
        </ul>
      </section>
      {isHost ? (
        <>
          <button className="primary" disabled={players.length < MIN_PLAYERS} onClick={() => run(startRoom(code, me.uid))}>
            {players.length < MIN_PLAYERS ? 'あと 1 人以上待っています…' : 'ゲーム開始'}
          </button>
          <button onClick={() => run(cancelRoom(code, me.uid))}>部屋を解散する（クレジットは返却）</button>
        </>
      ) : (
        <>
          <p className="center">ホストが開始するのを待っています…</p>
          <button onClick={() => run(leaveRoom(code, me.uid))}>部屋を抜ける（クレジットは返却）</button>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

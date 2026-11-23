import { useState } from 'react'
import { exitRoom, joinRoom, startRoom } from '../firebase/rooms'
import { MAX_BUY_IN, MAX_PLAYERS, MIN_PLAYERS } from '../game/config'
import type { GameState } from '../game/types'
import { BuyIn } from './BuyIn'
import { PlayerName } from './ItemView'
import { errorMessage } from './messages'

interface Props {
  code: string
  room: GameState
  me: { uid: string; displayName: string; icon: string | null }
  coins: number
  onLeave: () => void
}

export function WaitingRoom({ code, room, me, coins, onLeave }: Props) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [buyIn, setBuyIn] = useState(Math.min(MAX_BUY_IN, coins))
  const players = Object.values(room.players)
  const joined = Boolean(room.players[me.uid])

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <section className="card stack center">
        <small>部屋コード</small>
        <div className="code">{code}</div>
        <button onClick={() => navigator.clipboard?.writeText(code)}>コピー</button>
        <small>
          第 {room.round} ゲーム ／ 連続当たり {room.settings.streakToWin} 回で総取り ／ ハズレの確率は開始時にランダム（2/6・3/6・4/6）
        </small>
      </section>
      <section className="card">
        <h2>次のゲームの参加者（{players.length}/{MAX_PLAYERS}）</h2>
        <ul className="list">
          {players.map((p) => (
            <li key={p.uid}>
              <PlayerName name={p.displayName} icon={p.icon} />
              <span>{p.credits} cr</span>
            </li>
          ))}
          {players.length === 0 && <li><small>まだ誰も参加していません</small></li>}
        </ul>
      </section>

      {!joined && (
        <section className="card stack">
          <BuyIn value={buyIn} onChange={setBuyIn} coins={coins} />
          <button className="primary" disabled={busy} onClick={() => run(() => joinRoom(code, me, buyIn))}>
            このゲームに参加する
          </button>
        </section>
      )}
      {joined && (
        <button className="primary" disabled={busy || players.length < MIN_PLAYERS} onClick={() => run(() => startRoom(code, me.uid))}>
          {players.length < MIN_PLAYERS ? 'あと 1 人以上待っています…' : 'ゲーム開始'}
        </button>
      )}
      <button disabled={busy} onClick={() => run(async () => { await exitRoom(code, me.uid); onLeave() })}>
        部屋を出る{joined && '（クレジットは返却）'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

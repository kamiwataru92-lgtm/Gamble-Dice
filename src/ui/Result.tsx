import { useEffect, useRef, useState } from 'react'
import { exitRoom, nextGame, settle } from '../firebase/rooms'
import { itemById } from '../gacha/catalog'
import type { GameState } from '../game/types'
import { playBgm, stopBgm } from './bgm'
import { PlayerName } from './ItemView'
import { errorMessage } from './messages'

interface Props {
  code: string
  room: GameState
  me: { uid: string }
  coins: number
  onLeave: () => void
}

export function Result({ code, room, me, coins, onLeave }: Props) {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    settle(code, me.uid).catch(() => (done.current = false))
  }, [code, me.uid])

  const [error, setError] = useState('')
  const r = room.result
  const winnerPlayer = r?.winnerUid ? room.players[r.winnerUid] : undefined
  const winner = winnerPlayer?.displayName
  const bgm = itemById(winnerPlayer?.icon)?.bgm
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    if (!bgm) return
    playBgm(bgm).then((ok) => setBlocked(!ok))
    return stopBgm
  }, [bgm])
  const title =
    r?.reason === 'streak' ? `🏆 ${winner} が総取り！` : r?.reason === 'lastOne' ? '残り 1 人になったので終了' : '全員パスで終了'

  return (
    <div className="stack">
      <section className="card center stack">
        <h2>{title}</h2>
        {(r?.reason === 'allPass' || r?.reason === 'lastOne') && <small>生き残った人には、自分が没収された分がプールから戻りました。失格した人のクレジットは失われました</small>}
        {bgm && blocked && <button onClick={() => playBgm(bgm).then((ok) => setBlocked(!ok))}>♪ 勝利 BGM を再生</button>}
      </section>
      <section className="card">
        <ul className="list">
          {Object.values(room.players).map((p) => (
            <li key={p.uid}>
              <PlayerName name={p.displayName} icon={p.icon} />
              <span className="amount">
                {p.buyIn} → {p.credits} cr
                {r && r.payouts[p.uid] > 0 && <small>うちプール {r.payouts[p.uid]}</small>}
              </span>
            </li>
          ))}
        </ul>
        <small>終了時のクレジットはコインに戻ります。所持コイン：{coins.toLocaleString()}</small>
      </section>
      <button className="primary" onClick={() => nextGame(code).catch((e) => setError(errorMessage(e)))}>次のゲームへ</button>
      <button onClick={() => exitRoom(code, me.uid).then(onLeave).catch((e) => setError(errorMessage(e)))}>部屋を出る</button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

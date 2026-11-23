import { useEffect, useRef, useState } from 'react'
import { settle } from '../firebase/rooms'
import { itemById } from '../gacha/catalog'
import type { GameState } from '../game/types'
import { playBgm, stopBgm } from './bgm'
import { PlayerName } from './ItemView'

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
  const title = !r ? '部屋は解散されました' : r.reason === 'streak' ? `🏆 ${winner} が総取り！` : '全員パスで終了'

  return (
    <div className="stack">
      <section className="card center stack">
        <h2>{title}</h2>
        {r?.reason === 'allPass' && <small>プールは没収された額の割合で山分けされました</small>}
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
      <button className="primary" onClick={onLeave}>ロビーに戻る</button>
    </div>
  )
}

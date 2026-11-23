import { useEffect, useRef, useState } from 'react'
import { act } from '../firebase/rooms'
import { MAX_BET, MIN_BET, RATE_PERCENT } from '../game/config'
import { winAmount } from '../game/rules'
import type { GameState } from '../game/types'
import { Die } from './Die'
import { PlayerName } from './ItemView'
import { errorMessage } from './messages'

interface Props {
  code: string
  room: GameState
  me: { uid: string }
}


export function GameBoard({ code, room, me }: Props) {
  const current = room.turnOrder[room.currentTurnIndex]
  const mine = room.players[me.uid]
  const myTurn = current === me.uid
  const [bet, setBet] = useState(MIN_BET)
  const faces = room.loseFaces ?? 3
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const timedOut = useRef(0)
  const sending = useRef(false)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [])

  // Anyone in the room may auto-pass an expired turn; the first write wins, the rest are rejected.
  useEffect(() => {
    if (now >= room.turnDeadline && timedOut.current !== room.turnDeadline) {
      timedOut.current = room.turnDeadline
      act(code, { type: 'timeout', now }).catch(() => {})
    }
  }, [now, room.turnDeadline, code])

  useEffect(() => {
    if (mine && bet > mine.credits) setBet(Math.max(MIN_BET, mine.credits))
  }, [mine, bet])

  async function run(action: Parameters<typeof act>[1]) {
    // A ref, not just state: a fast double tap must not send two rolls before the re-render.
    if (sending.current) return
    sending.current = true
    setBusy(true)
    setError('')
    try {
      await act(code, action)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  const secondsLeft = Math.max(0, Math.ceil((room.turnDeadline - now) / 1000))
  const last = room.lastRoll
  const lastName = last ? room.players[last.uid]?.displayName : ''

  return (
    <div className="stack">
      <section className="card center pool">
        <small>中央のプール</small>
        <div className="big">{room.pool.toLocaleString()} cr</div>
        <small>
          このゲームのハズレ <strong>{faces}/6</strong>（当たれば +{RATE_PERCENT[faces]}%）／ 連続当たり {room.settings.streakToWin} 回で総取り
        </small>
      </section>

      {last && (
        <section className={`card center roll ${last.win ? 'win' : 'lose'}`} key={`${last.uid}-${room.turnDeadline}-${room.currentStreak}`}>
          <Die face={last.face} lose={!last.win} />
          <div>
            {lastName}：{last.win ? `当たり！ +${last.delta}` : `ハズレ… ${last.delta}`}
            <small> （賭け {last.bet}）</small>
          </div>
        </section>
      )}

      <section className="card">
        <ul className="list">
          {room.turnOrder.map((uid) => {
            const p = room.players[uid]
            return (
              <li key={uid} className={`${uid === current ? 'turn' : ''} ${p.eliminated ? 'out' : ''}`}>
                <span>
                  {uid === current && '▶ '}<PlayerName name={p.displayName} icon={p.icon} />{uid === me.uid && '（あなた）'}
                  {uid === current && room.currentStreak > 0 && ` 🔥${room.currentStreak}`}
                </span>
                <span>{p.eliminated ? '失格' : `${p.credits} cr`}</span>
              </li>
            )
          })}
        </ul>
        <small>
          残り {secondsLeft} 秒（時間切れで自動パス）
          {room.consecutivePasses > 0 && ` ／ 連続パス ${room.consecutivePasses}`}
        </small>
      </section>

      {myTurn && mine && !mine.eliminated && (
        <section className="card stack">
          <h2>あなたの番{room.currentStreak > 0 && `（${room.currentStreak} 連続当たり中）`}</h2>
          <label>
            賭け額（手持ち {mine.credits} cr）
            <input type="number" min={MIN_BET} max={Math.min(MAX_BET, mine.credits)} step={10} value={bet} onChange={(e) => setBet(e.target.valueAsNumber)} />
          </label>
          <small>
            {MIN_BET}〜{MAX_BET} cr ／ 当たれば +{Number.isFinite(bet) ? winAmount(bet, faces) : 0} cr ／ ハズレたら {bet} cr 没収
          </small>
          <div className="row">
            <button className="primary grow" disabled={busy}
              onClick={() => run({ type: 'roll', uid: me.uid, bet })}>
              🎲 振る
            </button>
            <button className="grow" disabled={busy} onClick={() => run({ type: 'pass', uid: me.uid })}>
              パス
            </button>
          </div>
        </section>
      )}
      {mine?.eliminated && <p className="center">クレジットが {MIN_BET} 未満になったので失格です。残りのクレジットも没収されました。観戦中…</p>}
      {!mine && <p className="center">観戦中です。ゲームが終わると次のゲームに参加できます。</p>}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

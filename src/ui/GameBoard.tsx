import { useEffect, useRef, useState } from 'react'
import { act } from '../firebase/rooms'
import { RATES } from '../game/config'
import { winAmount } from '../game/rules'
import type { GameState, LoseFaces } from '../game/types'
import { Die } from './Die'
import { errorMessage } from './messages'

interface Props {
  code: string
  room: GameState
  me: { uid: string }
}

const FACES: LoseFaces[] = [1, 2, 3, 4, 5]

export function GameBoard({ code, room, me }: Props) {
  const current = room.turnOrder[room.currentTurnIndex]
  const mine = room.players[me.uid]
  const myTurn = current === me.uid
  const [bet, setBet] = useState(Math.min(10, mine?.credits ?? 1))
  const [faces, setFaces] = useState<LoseFaces>(1)
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
    if (mine && bet > mine.credits) setBet(mine.credits)
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
          連続当たり {room.settings.streakToWin} 回で総取り ／ 没収：{room.settings.forfeitMode === 'bet' ? '賭けた額' : '半分'}
        </small>
      </section>

      {last && (
        <section className={`card center roll ${last.win ? 'win' : 'lose'}`} key={`${last.uid}-${room.turnDeadline}-${room.currentStreak}`}>
          <Die face={last.face} lose={!last.win} />
          <div>
            {lastName}：{last.win ? `当たり！ +${last.delta}` : `ハズレ… ${last.delta}`}
            <small> （ハズレ {last.loseFaces}/6、賭け {last.bet}）</small>
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
                  {uid === current && '▶ '}{p.displayName}{uid === me.uid && '（あなた）'}
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
            <input type="number" min={1} max={mine.credits} value={bet} onChange={(e) => setBet(e.target.valueAsNumber)} />
          </label>
          <div className="faces">
            {FACES.map((f) => (
              <button key={f} className={f === faces ? 'selected' : ''} onClick={() => setFaces(f)}>
                ハズレ {f}/6
                <small>+{Math.round(RATES[f] * 100)}%</small>
              </button>
            ))}
          </div>
          <small>
            当たれば +{Number.isFinite(bet) ? winAmount(bet, faces) : 0} cr ／ ハズレたら{' '}
            {room.settings.forfeitMode === 'bet' ? `${bet} cr` : `${Math.max(1, Math.floor(mine.credits / 2))} cr`} 没収
          </small>
          <div className="row">
            <button className="primary grow" disabled={busy}
              onClick={() => run({ type: 'roll', uid: me.uid, bet, loseFaces: faces })}>
              🎲 振る
            </button>
            <button className="grow" disabled={busy} onClick={() => run({ type: 'pass', uid: me.uid })}>
              パス
            </button>
          </div>
        </section>
      )}
      {mine?.eliminated && <p className="center">クレジットがなくなったので失格です。観戦中…</p>}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

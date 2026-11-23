import { useState } from 'react'
import { createRoom, joinRoom } from '../firebase/rooms'
import { DEFAULT_STREAK, MAX_BUY_IN, MAX_STREAK, MIN_STREAK } from '../game/config'
import type { ForfeitMode } from '../game/types'
import { errorMessage } from './messages'

interface Props {
  me: { uid: string; displayName: string; icon: string | null }
  coins: number
  onEnter: (code: string) => void
}

export function Lobby({ me, coins, onEnter }: Props) {
  const [buyIn, setBuyIn] = useState(100)
  const [mode, setMode] = useState<ForfeitMode>('bet')
  const [streak, setStreak] = useState(DEFAULT_STREAK)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<string>) {
    setBusy(true)
    setError('')
    try {
      onEnter(await fn())
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h2>持ち込むクレジット</h2>
        <label>
          コインから換えるクレジット（最大 {MAX_BUY_IN}、あとから追加できません）
          <input type="number" min={1} max={Math.min(MAX_BUY_IN, coins)} value={buyIn} onChange={(e) => setBuyIn(e.target.valueAsNumber)} />
        </label>
        <small>所持コイン：{coins.toLocaleString()}（1 コイン = 1 クレジット）</small>
      </section>

      <section className="card stack">
        <h2>部屋を作る</h2>
        <fieldset>
          <legend>ハズレたときの没収</legend>
          <label className="row"><input type="radio" checked={mode === 'bet'} onChange={() => setMode('bet')} /> 賭けた額だけ</label>
          <label className="row"><input type="radio" checked={mode === 'half'} onChange={() => setMode('half')} /> 持っているクレジットの半分</label>
        </fieldset>
        <label>
          総取りに必要な連続当たり
          <input type="number" min={MIN_STREAK} max={MAX_STREAK} value={streak} onChange={(e) => setStreak(e.target.valueAsNumber)} />
        </label>
        <button className="primary" disabled={busy}
          onClick={() => run(() => createRoom(me, { forfeitMode: mode, streakToWin: streak }, buyIn))}>
          部屋を作る
        </button>
      </section>

      <section className="card stack">
        <h2>部屋に参加する</h2>
        <label>
          部屋コード
          <input value={joinCode} maxLength={6} placeholder="ABC234"
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().trim())} />
        </label>
        <button className="primary" disabled={busy || joinCode.length !== 6}
          onClick={() => run(async () => (await joinRoom(joinCode, me, buyIn), joinCode))}>
          参加する
        </button>
      </section>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

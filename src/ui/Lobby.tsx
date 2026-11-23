import { useState } from 'react'
import { createRoom, joinRoom } from '../firebase/rooms'
import { renameUser } from '../firebase/wallet'
import { DEFAULT_STREAK, MAX_BUY_IN, MAX_STREAK, MIN_STREAK } from '../game/config'
import { BuyIn } from './BuyIn'
import { MAX_NAME_LENGTH } from '../game/profile'
import { errorMessage } from './messages'

interface Props {
  me: { uid: string; displayName: string; icon: string | null }
  coins: number
  onEnter: (code: string) => void
}

export function Lobby({ me, coins, onEnter }: Props) {
  const [buyIn, setBuyIn] = useState(MAX_BUY_IN)
  const [streak, setStreak] = useState(DEFAULT_STREAK)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [nameError, setNameError] = useState('')

  async function saveName() {
    if (editingName === null) return
    try {
      await renameUser(me.uid, editingName)
      setEditingName(null)
      setNameError('')
    } catch (e) {
      setNameError(errorMessage(e))
    }
  }

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
        <h2>あなたの名前</h2>
        {editingName === null ? (
          <div className="row">
            <span className="grow">{me.displayName}</span>
            <button onClick={() => setEditingName(me.displayName)}>変更</button>
          </div>
        ) : (
          <>
            <input value={editingName} maxLength={40} autoFocus
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveName()} />
            <small>{MAX_NAME_LENGTH} 文字まで。これから入る部屋から反映されます。</small>
            <div className="row">
              <button className="primary grow" onClick={saveName}>保存</button>
              <button className="grow" onClick={() => { setEditingName(null); setNameError('') }}>やめる</button>
            </div>
          </>
        )}
        {nameError && <p className="error">{nameError}</p>}
      </section>

      <section className="card stack">
        <h2>持ち込むクレジット</h2>
        <BuyIn value={buyIn} onChange={setBuyIn} coins={coins} />
      </section>

      <section className="card stack">
        <h2>部屋を作る</h2>
        <small>ハズレの確率はゲームごとにランダム（2/6・3/6・4/6）。ゲームが終わっても部屋は残り、続けて遊べます。</small>
        <label>
          総取りに必要な連続当たり
          <input type="number" min={MIN_STREAK} max={MAX_STREAK} value={streak} onChange={(e) => setStreak(e.target.valueAsNumber)} />
        </label>
        <button className="primary" disabled={busy}
          onClick={() => run(() => createRoom(me, { streakToWin: streak }, buyIn))}>
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

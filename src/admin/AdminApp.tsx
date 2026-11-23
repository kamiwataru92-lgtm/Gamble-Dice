import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useMemo, useState } from 'react'
import { ITEMS, itemById } from '../gacha/catalog'
import { RARITY_LABELS, RARITIES } from '../gacha/config'
import { ItemView } from '../ui/ItemView'
import { errorMessage } from '../ui/messages'
import { auth } from '../firebase/app'
import { ADMIN_PASSWORD_SHA256 } from './config'
import { changeCoins, listPlayers, sendItem, type Player } from './firebase'
import { isAdminPassword, MAX_GIVE_COUNT } from './ops'

const UNLOCK_KEY = 'gamble-dice-admin-unlocked'
function readUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1'
  } catch {
    return false
  }
}
function writeUnlocked(v: boolean) {
  try {
    if (v) sessionStorage.setItem(UNLOCK_KEY, '1')
    else sessionStorage.removeItem(UNLOCK_KEY)
  } catch {
    /* storage unavailable: stay unlocked for this page only */
  }
}

function Unlock({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  return (
    <form className="card stack" onSubmit={async (e) => {
      e.preventDefault()
      if (await isAdminPassword(password, ADMIN_PASSWORD_SHA256)) onUnlock()
      else setError('パスワードが違います')
    }}>
      <h2>管理者ログイン</h2>
      <input type="text" autoComplete="username" value="Gamble Dice 管理者" readOnly hidden />
      <label>パスワード<input type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <button className="primary" disabled={!password}>ログイン</button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}

function PlayerPanel({ player, onDone }: { player: Player; onDone: () => void }) {
  const [amount, setAmount] = useState(1000)
  const [itemId, setItemId] = useState(ITEMS[0].id)
  const [count, setCount] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await fn()
      setMessage(ok)
      onDone()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const item = itemById(itemId)
  return (
    <section className="card stack">
      <h2>{player.displayName}</h2>
      <small>所持コイン：{player.coins.toLocaleString()} ／ UID：{player.uid}</small>

      <label>
        コインの額
        <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.valueAsNumber)} />
      </label>
      <div className="row">
        <button className="primary grow" disabled={busy} onClick={() => run(() => changeCoins(player.uid, amount), `${amount} コイン増やしました`)}>
          ＋ 増やす
        </button>
        <button className="grow" disabled={busy} onClick={() => run(() => changeCoins(player.uid, -amount), `${amount} コイン減らしました`)}>
          − 減らす
        </button>
      </div>

      <label>
        配るアイテム
        <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
          {RARITIES.slice().reverse().map((r) => {
            const list = ITEMS.filter((i) => i.rarity === r)
            return list.length ? (
              <optgroup key={r} label={RARITY_LABELS[r]}>
                {list.map((i) => <option key={i.id} value={i.id}>{i.emoji ?? ''} {i.name}</option>)}
              </optgroup>
            ) : null
          })}
        </select>
      </label>
      <div className="row">
        {item && <ItemView item={item} />}
        <input type="number" min={1} max={MAX_GIVE_COUNT} value={count} onChange={(e) => setCount(e.target.valueAsNumber)} />
        <span>個</span>
      </div>
      <button className="primary" disabled={busy} onClick={() => run(() => sendItem(player.uid, itemId, count), `${item?.name} を ${count} 個配りました`)}>
        アイテムを配る
      </button>
      {message && <p className="center ok">{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  )
}

function Dashboard() {
  const [players, setPlayers] = useState<Player[] | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState('')

  const reload = () => listPlayers().then(setPlayers).catch((e) => setError(errorMessage(e)))
  useEffect(() => { reload() }, [])

  const shown = useMemo(
    () => (players ?? []).filter((p) => p.displayName.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja')),
    [players, query],
  )
  const current = players?.find((p) => p.uid === selected)

  return (
    <div className="stack">
      {current && <PlayerPanel key={current.uid} player={current} onDone={reload} />}
      <section className="card stack">
        <h2>プレイヤー（{players?.length ?? '…'} 人）</h2>
        <input placeholder="名前で検索" value={query} onChange={(e) => setQuery(e.target.value)} />
        <ul className="list">
          {shown.map((p) => (
            <li key={p.uid} className={p.uid === selected ? 'turn' : ''} onClick={() => setSelected(p.uid)} style={{ cursor: 'pointer' }}>
              <span>{p.displayName}</span>
              <span>🪙 {p.coins.toLocaleString()}</span>
            </li>
          ))}
        </ul>
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  )
}

export function AdminApp() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [unlocked, setUnlocked] = useState(readUnlocked)
  useEffect(() => onAuthStateChanged(auth, setUser), [])

  let body
  if (user === undefined) body = <p className="center">読み込み中…</p>
  else if (!user) body = <p className="center">先に <a href="/">ゲーム</a> で Google ログインしてから、もう一度 /admin を開いてください。</p>
  else if (!unlocked) body = <Unlock onUnlock={() => { writeUnlocked(true); setUnlocked(true) }} />
  else body = <Dashboard />

  return (
    <>
      <header className="bar">
        <strong>Gamble Dice 管理</strong>
        <span>
          <a className="link" href="/">ゲームへ</a>
          {unlocked && <button className="link" onClick={() => { writeUnlocked(false); setUnlocked(false) }}>管理を終了</button>}
        </span>
      </header>
      <main>{body}</main>
    </>
  )
}

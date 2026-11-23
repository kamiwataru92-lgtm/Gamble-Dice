import { useState } from 'react'
import { signInAsTestUser, signInWithGoogle, usingEmulator } from '../firebase/app'

export function Login() {
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  return (
    <main className="center stack">
      <h1>🎲 Gamble Dice</h1>
      <p>ハズレの確率を自分で選んで、どこまで攻めるかを競うダイスゲーム。</p>
      <button className="primary" onClick={() => signInWithGoogle().catch(() => setError('ログインできませんでした'))}>
        Google でログイン
      </button>
      {usingEmulator && (
        <div className="card stack">
          <small>開発用（エミュレーター）</small>
          <input value={name} placeholder="名前" onChange={(e) => setName(e.target.value)} />
          <button disabled={!name} onClick={() => signInAsTestUser(name).catch(() => setError('ログインできませんでした'))}>
            テストユーザーでログイン
          </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </main>
  )
}

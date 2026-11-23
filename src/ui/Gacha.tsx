import { useState } from 'react'
import { buyGacha } from '../firebase/wallet'
import { PRICES, RARITY_LABELS, RARITY_RATES, RARITIES } from '../gacha/config'
import type { Item } from '../gacha/types'
import { ItemView } from './ItemView'
import { errorMessage } from './messages'

export function Gacha({ uid, coins }: { uid: string; coins: number }) {
  const [result, setResult] = useState<Item[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pull(count: 1 | 9) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      setResult(await buyGacha(uid, count))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      {result && (
        <section className={`card gacha-result count-${result.length}`}>
          {result.map((item, i) => (
            <div key={i} className={`gacha-cell r-${item.rarity}`} style={{ animationDelay: `${i * 0.08}s` }}>
              <ItemView item={item} size="lg" />
              <small>{RARITY_LABELS[item.rarity]}</small>
            </div>
          ))}
        </section>
      )}
      <div className="row">
        <button className="primary grow" disabled={busy || coins < PRICES[1]} onClick={() => pull(1)}>
          1連<br /><small>🪙 {PRICES[1].toLocaleString()}</small>
        </button>
        <button className="primary grow" disabled={busy || coins < PRICES[9]} onClick={() => pull(9)}>
          9連<br /><small>🪙 {PRICES[9].toLocaleString()}（レア以上 1 つ保証）</small>
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <section className="card">
        <h2>提供割合</h2>
        <ul className="list">
          {RARITIES.map((r) => (
            <li key={r}>
              <span className={`rarity r-${r}`}>{RARITY_LABELS[r]}</span>
              <span>{+(RARITY_RATES[r] * 100).toFixed(2)}%</span>
            </li>
          ))}
        </ul>
        <small>該当するアイテムがまだないレア度は、一つ下のレア度になります。</small>
      </section>
    </div>
  )
}

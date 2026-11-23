import { useState } from 'react'
import { equipIcon } from '../firebase/wallet'
import { ITEMS } from '../gacha/catalog'
import { RARITY_LABELS, RARITIES } from '../gacha/config'
import { ItemView } from './ItemView'
import { errorMessage } from './messages'

interface Props {
  uid: string
  items: Record<string, number>
  icon: string | null
}

export function Collection({ uid, items, icon }: Props) {
  const [error, setError] = useState('')
  const owned = ITEMS.filter((i) => items[i.id] > 0)
  const equip = (id: string | null) => equipIcon(uid, id).catch((e) => setError(errorMessage(e)))

  return (
    <div className="stack">
      <small>
        所持 {owned.length} / {ITEMS.length} 種類。タップでアイコンに設定（部屋で名前の横に表示されます）。
      </small>
      {icon && <button onClick={() => equip(null)}>アイコンを外す</button>}
      {owned.length === 0 && <p className="center">まだアイテムがありません。ガチャを引いてみよう。</p>}
      {RARITIES.slice().reverse().map((r) => {
        const list = owned.filter((i) => i.rarity === r)
        if (!list.length) return null
        return (
          <section key={r} className="card">
            <h2 className={`rarity r-${r}`}>{RARITY_LABELS[r]}</h2>
            <div className="collection">
              {list.map((i) => (
                <button key={i.id} className={`collection-cell r-${r} ${icon === i.id ? 'selected' : ''}`}
                  onClick={() => equip(icon === i.id ? null : i.id)} title={i.name}>
                  <ItemView item={i} />
                  <small>×{items[i.id]}</small>
                </button>
              ))}
            </div>
          </section>
        )
      })}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

import { itemById } from '../gacha/catalog'
import type { Item } from '../gacha/types'

export function ItemView({ item, size = 'md' }: { item: Item; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`item item-${size}`} title={item.name}>
      {item.image ? <img src={item.image} alt={item.name} /> : item.emoji}
    </span>
  )
}

/** A player's name with their equipped gacha icon in front. */
export function PlayerName({ name, icon }: { name: string; icon?: string | null }) {
  const item = itemById(icon)
  return (
    <span className="player-name">
      {item && <ItemView item={item} size="sm" />}
      {name}
    </span>
  )
}

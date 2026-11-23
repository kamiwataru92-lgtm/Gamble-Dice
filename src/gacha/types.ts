export type Rarity = 'common' | 'uncommon' | 'rare' | 'superRare' | 'epic' | 'legendary' | 'mythic'

export interface Item {
  id: string
  rarity: Rarity
  name: string
  /** Shown when there is no image. */
  emoji?: string
  /** Path under public/, e.g. "/items/doge.png". */
  image?: string
  /** Path under public/, played when the owner wins the pool. Super rare and above only. */
  bgm?: string
}

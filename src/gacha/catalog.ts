import type { Item, Rarity } from './types'

/**
 * Every gacha item. Add new ones at the end of a section; never change or reuse an `id`
 * (players' collections are stored by id).
 *
 * Meme characters (epic and above) go here too, e.g.
 *   { id: 'my-meme', rarity: 'epic', name: '名前', image: '/items/my-meme.png', bgm: '/items/my-meme.mp3' }
 * with the files placed in public/items/. `bgm` is only allowed for superRare and above.
 */
const emoji = (rarity: Rarity, list: [string, string, string][]): Item[] =>
  list.map(([id, e, name]) => ({ id, rarity, emoji: e, name }))

export const ITEMS: Item[] = [
  // コモン：ミーム性の弱い絵文字
  ...emoji('common', [
    ['grinning', '😀', 'にっこり'],
    ['smile', '😊', 'ほほえみ'],
    ['thumbs-up', '👍', 'いいね'],
    ['heart', '❤️', 'ハート'],
    ['star', '⭐', 'ほし'],
    ['sun', '☀️', 'たいよう'],
    ['apple', '🍎', 'りんご'],
    ['dog', '🐶', 'いぬ'],
    ['cat', '🐱', 'ねこ'],
    ['flower', '🌸', 'さくら'],
    ['rice-ball', '🍙', 'おにぎり'],
    ['soccer', '⚽', 'サッカー'],
  ]),
  // アンコモン：ミーム性が少しある絵文字
  ...emoji('uncommon', [
    ['rainbow-flag', '🏳️‍🌈', 'レインボーフラッグ'],
    ['pregnant-man', '🫃', '妊娠した男性'],
    ['melting', '🫠', 'とける顔'],
    ['pinched', '🤌', 'イタリアンハンド'],
    ['nail-polish', '💅', 'ネイル'],
    ['woozy', '🥴', 'ふらふら'],
    ['frog', '🐸', 'カエル'],
    ['salute', '🫡', '敬礼'],
  ]),
  // レア：ミーム性の強い絵文字
  ...emoji('rare', [
    ['moai', '🗿', 'モアイ'],
    ['skull', '💀', 'ドクロ'],
    ['clown', '🤡', 'ピエロ'],
    ['goat', '🐐', 'GOAT'],
    ['cap', '🧢', 'キャップ'],
    ['red-flag', '🚩', 'レッドフラッグ'],
    ['loudly-crying', '😭', '号泣'],
    ['flushed', '😳', '赤面'],
  ]),
  // スーパーレア：国旗（BGM・画像はあとから追加）
  ...emoji('superRare', [
    ['flag-jp', '🇯🇵', '日本'],
    ['flag-us', '🇺🇸', 'アメリカ'],
    ['flag-cn', '🇨🇳', '中国'],
    ['flag-tw', '🇹🇼', '台湾'],
    ['flag-il', '🇮🇱', 'イスラエル'],
    ['flag-kr', '🇰🇷', '韓国'],
    ['flag-ru', '🇷🇺', 'ロシア'],
    ['flag-fr', '🇫🇷', 'フランス'],
    ['flag-de', '🇩🇪', 'ドイツ'],
    ['flag-gb', '🇬🇧', 'イギリス'],
    ['flag-it', '🇮🇹', 'イタリア'],
    ['flag-br', '🇧🇷', 'ブラジル'],
    ['flag-in', '🇮🇳', 'インド'],
  ]),
  // Epic / Legendary / Mythic：ミームキャラ（利用者が追加）
]

export const itemById = (id: string | null | undefined): Item | undefined =>
  id ? ITEMS.find((i) => i.id === id) : undefined

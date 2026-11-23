import { GameError } from '../game/engine'

const MESSAGES: Record<string, string> = {
  not_your_turn: 'あなたの番ではありません',
  invalid_bet: '賭け額は 20〜100、かつ手持ちクレジット以下の整数にしてください',
  not_playing: 'ゲームは進行中ではありません',
  not_expired: 'まだ持ち時間が残っています',
  not_enough_players: '2 人以上そろうと開始できます',
  already_started: 'このゲームはもう始まっています',
  invalid_buyin: '持ち込み額は 20〜100 の整数にしてください',
  insufficient_coins: 'コインが足りません',
  room_full: 'この部屋は満員です（最大 6 人）',
  already_joined: 'すでにこの部屋に参加しています',
  not_found: '部屋が見つかりません。部屋コードを確かめてください',
  not_host: 'ホストだけが操作できます',
  invalid_settings: '連続当たりの回数は 1〜10 にしてください',
  not_finished: 'ゲームはまだ終わっていません',
  no_user: 'ユーザー情報がありません。ログインし直してください',
  not_in_room: 'このゲームに参加していません',
  host_cannot_leave: 'ホストは部屋を解散してください',
  not_owned: 'そのアイテムを持っていません',
  invalid_name: '名前は 1〜12 文字で入力してください',
  invalid_amount: '数は 1 以上の整数で入力してください',
  negative_coins: 'コインが 0 未満になるので減らせません',
  unknown_item: 'そのアイテムはありません',
  invalid_handle: 'フレンドID は半角の英小文字・数字・_ で 3〜16 文字にしてください',
  handle_taken: 'そのフレンドID はほかの人が使っています',
  self_request: '自分には申請できません',
  already_friends: 'すでにフレンドです',
  request_gone: 'その申請はもうありません',
  code_collision: '部屋コードを作れませんでした。もう一度お試しください',
}

export function errorMessage(e: unknown): string {
  if (e instanceof GameError) return MESSAGES[e.code] ?? e.code
  return 'エラーが発生しました。通信状態を確かめて、もう一度お試しください'
}

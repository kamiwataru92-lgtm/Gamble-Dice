import { GameError } from '../game/engine'

const MESSAGES: Record<string, string> = {
  not_your_turn: 'あなたの番ではありません',
  invalid_bet: '賭け額は 1 以上、手持ちクレジット以下の整数にしてください',
  invalid_faces: 'ハズレの面数は 1〜5 で選んでください',
  not_playing: 'ゲームは進行中ではありません',
  not_expired: 'まだ持ち時間が残っています',
  not_enough_players: '2 人以上そろうと開始できます',
  already_started: 'このゲームはもう始まっています',
  invalid_buyin: '持ち込み額は 1 以上の整数にしてください',
  insufficient_coins: 'コインが足りません',
  room_full: 'この部屋は満員です（最大 6 人）',
  already_joined: 'すでにこの部屋に参加しています',
  not_found: '部屋が見つかりません。部屋コードを確かめてください',
  not_host: 'ホストだけが操作できます',
  invalid_settings: '連続当たりの回数は 1〜10 にしてください',
  not_finished: 'ゲームはまだ終わっていません',
  no_user: 'ユーザー情報がありません。ログインし直してください',
  code_collision: '部屋コードを作れませんでした。もう一度お試しください',
}

export function errorMessage(e: unknown): string {
  if (e instanceof GameError) return MESSAGES[e.code] ?? e.code
  return 'エラーが発生しました。通信状態を確かめて、もう一度お試しください'
}

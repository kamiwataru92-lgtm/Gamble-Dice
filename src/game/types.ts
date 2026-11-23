export type LoseFaces = 2 | 3 | 4

export interface PlayerState {
  uid: string
  displayName: string
  /** Gacha item id shown next to the name (set at join time). */
  icon: string | null
  credits: number
  buyIn: number
  forfeitedTotal: number
  eliminated: boolean
  settled: boolean
}

export interface GameSettings {
  streakToWin: number
}

export interface LastRoll {
  uid: string
  bet: number
  face: number
  win: boolean
  /** Credits gained (positive) or forfeited (negative). */
  delta: number
}

export interface GameResult {
  reason: 'streak' | 'allPass' | 'lastOne'
  winnerUid?: string
  /** Pool credits paid to each player at the end. */
  payouts: Record<string, number>
}

export interface GameState {
  status: 'waiting' | 'playing' | 'finished'
  /** 1 for the first game in this room, +1 for each next game. */
  round: number
  settings: GameSettings
  /** Losing faces out of 6 for this game, picked at start. */
  loseFaces: LoseFaces | null
  players: Record<string, PlayerState>
  turnOrder: string[]
  currentTurnIndex: number
  currentStreak: number
  rolledThisTurn: boolean
  consecutivePasses: number
  pool: number
  /** Epoch ms after which the current turn may be auto-passed. */
  turnDeadline: number
  lastRoll: LastRoll | null
  result: GameResult | null
  /** Credits owed to players from earlier games in this room who have not cashed out yet. */
  unsettled: Record<string, number>
}

export type Action =
  | { type: 'roll'; uid: string; bet: number }
  | { type: 'pass'; uid: string }
  | { type: 'timeout'; now: number }

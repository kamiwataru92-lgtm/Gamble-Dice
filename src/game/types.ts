export type ForfeitMode = 'bet' | 'half'
export type LoseFaces = 1 | 2 | 3 | 4 | 5

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
  forfeitMode: ForfeitMode
  streakToWin: number
}

export interface LastRoll {
  uid: string
  bet: number
  loseFaces: LoseFaces
  face: number
  win: boolean
  /** Credits gained (positive) or forfeited (negative). */
  delta: number
}

export interface GameResult {
  reason: 'streak' | 'allPass'
  winnerUid?: string
  /** Pool credits paid to each player at the end. */
  payouts: Record<string, number>
}

export interface GameState {
  status: 'waiting' | 'playing' | 'finished'
  hostUid: string
  settings: GameSettings
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
}

export type Action =
  | { type: 'roll'; uid: string; bet: number; loseFaces: LoseFaces }
  | { type: 'pass'; uid: string }
  | { type: 'timeout'; now: number }

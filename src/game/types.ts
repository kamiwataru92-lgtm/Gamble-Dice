export type ForfeitMode = 'bet' | 'half'
export type LoseFaces = 1 | 2 | 3 | 4 | 5

export interface PlayerState {
  uid: string
  displayName: string
  credits: number
  buyIn: number
  forfeitedTotal: number
  eliminated: boolean
  settled: boolean
}

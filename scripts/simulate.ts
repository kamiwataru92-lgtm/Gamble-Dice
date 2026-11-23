// Plays many games with the real engine and prints how big everyone's total gets by the end, as a
// percentage of the buy-ins. Use it to tune RATE_PERCENT in src/game/config.ts.
//   npm run simulate            (N=20000 games per case)
//   N=5000 npm run simulate
import { applyAction, startGame } from '../src/game/engine'
import { RATE_PERCENT } from '../src/game/config'
import { addPlayer, createState } from '../src/game/lobby'
import type { GameState } from '../src/game/types'

type Strategy = { name: string; bet: (credits: number) => number; rollsPerTurn: number }
const strategies: Strategy[] = [
  { name: 'bet 20, roll once', bet: () => 20, rollsPerTurn: 1 },
  { name: 'bet 50, roll once', bet: () => 50, rollsPerTurn: 1 },
  { name: 'bet 100, roll once', bet: (c) => Math.min(100, c), rollsPerTurn: 1 },
  { name: 'bet 20, up to 3 rolls', bet: () => 20, rollsPerTurn: 3 },
  { name: 'bet 50, up to 3 rolls', bet: () => 50, rollsPerTurn: 3 },
]

function play(players: number, st: Strategy): number {
  let s: GameState = createState({ uid: 'p0', displayName: 'p0' }, { streakToWin: 3 }, 100, 1e9)
  for (let i = 1; i < players; i++) s = addPlayer(s, { uid: 'p' + i, displayName: 'p' + i }, 100, 1e9)
  s = startGame(s, Math.random, 0)
  let steps = 0
  let rolled = 0
  while (s.status === 'playing' && steps++ < 10000) {
    const uid = s.turnOrder[s.currentTurnIndex]
    const p = s.players[uid]
    const bet = Math.max(20, Math.min(st.bet(p.credits), p.credits))
    if (rolled < st.rollsPerTurn && p.credits >= 20) {
      const before = s.currentTurnIndex
      s = applyAction(s, { type: 'roll', uid, bet }, Math.random, 0)
      rolled = s.status === 'playing' && s.currentTurnIndex === before && s.lastRoll?.win ? rolled + 1 : 0
      if (s.status === 'playing' && s.currentTurnIndex === before && rolled >= st.rollsPerTurn) {
        s = applyAction(s, { type: 'pass', uid }, Math.random, 0)
        rolled = 0
      }
    } else {
      s = applyAction(s, { type: 'pass', uid }, Math.random, 0)
      rolled = 0
    }
  }
  return Object.values(s.players).reduce((t, q) => t + q.credits, 0) / (players * 100)
}

const N = Number(process.env.N ?? 20000)
console.log(`RATE_PERCENT 2/6 +${RATE_PERCENT[2]}%, 3/6 +${RATE_PERCENT[3]}%, 4/6 +${RATE_PERCENT[4]}%  (${N} games per case)`)
const rows: number[] = []
for (const players of [2, 4]) {
  for (const st of strategies) {
    let sum = 0
    for (let i = 0; i < N; i++) sum += play(players, st)
    const pct = (100 * sum) / N
    rows.push(pct)
    console.log(`${players} players, ${st.name}: ${pct.toFixed(0)}%`)
  }
}
console.log(`average ${(rows.reduce((a, b) => a + b, 0) / rows.length).toFixed(0)}%`)

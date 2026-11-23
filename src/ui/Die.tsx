/** Pip positions on a 3x3 grid (0..8, row-major) for faces 1..6. */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

export function Die({ face, lose }: { face: number; lose: boolean }) {
  return (
    <div className={`die ${lose ? 'lose' : 'win'}`} role="img" aria-label={`${face} の目`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={PIPS[face]?.includes(i) ? 'pip' : ''} />
      ))}
    </div>
  )
}

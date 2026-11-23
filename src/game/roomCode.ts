const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(rng: () => number): string {
  let code = ''
  for (let i = 0; i < 6; i++) code += ALPHABET[Math.floor(rng() * ALPHABET.length)]
  return code
}

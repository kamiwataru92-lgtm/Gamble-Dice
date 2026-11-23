import { GameError } from './engine'

export const MAX_NAME_LENGTH = 12

/** Trim and validate a display name: 1–12 characters (emoji count as one), no control characters. */
export function normalizeName(raw: string): string {
  const name = raw.trim()
  const length = [...new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(name)].length
  if (length < 1 || length > MAX_NAME_LENGTH || /\p{Cc}/u.test(name)) throw new GameError('invalid_name')
  return name
}

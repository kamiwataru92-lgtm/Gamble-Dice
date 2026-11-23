import { GameError } from './engine'

/** Friend search ID: 3–16 of a-z, 0-9, _ (typed case-insensitively). */
export function normalizeHandle(raw: string): string {
  const handle = raw.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,16}$/.test(handle)) throw new GameError('invalid_handle')
  return handle
}

/** One request document per direction: `${from}_${to}`. */
export function friendRequestId(from: string, to: string): string {
  if (from === to) throw new GameError('self_request')
  return `${from}_${to}`
}

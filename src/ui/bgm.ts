let current: HTMLAudioElement | null = null

/** Play a BGM file. Resolves false when the browser blocks autoplay. */
export async function playBgm(src: string): Promise<boolean> {
  stopBgm()
  current = new Audio(src)
  try {
    await current.play()
    return true
  } catch {
    return false
  }
}

export function stopBgm() {
  current?.pause()
  current = null
}

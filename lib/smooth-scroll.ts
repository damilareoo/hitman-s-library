import type Lenis from 'lenis'

/**
 * A single handle for the one window-scrolling instance. Anything that opens
 * its own layer (the phone sheet, a dialog) has to stop the page underneath,
 * and that caller should not have to know how the instance was created.
 */
let instance: Lenis | null = null

export function setLenis(next: Lenis | null) {
  instance = next
}

export function getLenis(): Lenis | null {
  return instance
}

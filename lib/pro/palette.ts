// lib/pro/palette.ts
//
// The colour rules of the Pro moment, shared by the animation (ProMark) and
// the welcome email so both always agree: one coherent hue window (±46°)
// centred on the member's own colours, never a rainbow; only colours that
// read against the surface; and in the finished word, hue runs left to right
// with the lightest colour on top of each column.

export type Swatch = [hex: string, site: string]

export function hsl(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255
  const M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2, d = M - m
  if (!d) return [0, 0, l]
  const k = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(k * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1)), l]
}

export const hueDist = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) }

/** Vivid, and legible on the surface: no pale tints on white, no near-blacks on dark. */
export const legible = (hex: string, dark: boolean) => {
  const [, sat, l] = hsl(hex)
  return sat > 0.42 && (dark ? l > 0.36 && l < 0.78 : l > 0.24 && l < 0.6)
}

/** The hue with the most colours within ±46°. */
export function centreOf(swatches: Swatch[]): number {
  let centre = 30, most = -1
  for (let c = 0; c < 360; c += 10) {
    const n = swatches.filter(s => hueDist(hsl(s[0])[0], c) < 46).length
    if (n > most) { most = n; centre = c }
  }
  return centre
}

/** One coherent window of colours, centred on the member's own (or on the library's when they have none). */
export function hueWindow(all: Swatch[], centreFrom: Swatch[], dark: boolean): Swatch[] {
  const ok = all.filter(s => legible(s[0], dark))
  const seed = centreFrom.filter(s => legible(s[0], dark))
  const centre = centreOf(seed.length ? seed : ok)
  const pool = ok.filter(s => hueDist(hsl(s[0])[0], centre) < 46)
  return pool.length >= 6 ? pool : ok.length ? ok : all
}

/**
 * Colours for each slot of the word: hue runs left to right across columns,
 * and inside each column the lightest sits on top.
 */
export function sortForSlots(slots: readonly (readonly [number, number])[], cols: Swatch[], centre: number): Swatch[] {
  const rel = (c: string) => ((hsl(c)[0] - centre + 540) % 360) - 180
  const byCol = new Map<number, number[]>()
  slots.forEach((s, i) => (byCol.get(s[0]) ?? byCol.set(s[0], []).get(s[0])!).push(i))
  const sorted = [...cols].sort((a, b) => rel(a[0]) - rel(b[0])), res = new Array<Swatch>(slots.length)
  let p = 0
  for (const k of [...byCol.keys()].sort((a, b) => a - b)) {
    const col = byCol.get(k)!.sort((a, b) => slots[a][1] - slots[b][1])
    const chunk = sorted.slice(p, p + col.length).sort((a, b) => hsl(b[0])[2] - hsl(a[0])[2]); p += col.length
    col.forEach((id, j) => { res[id] = chunk[j] })
  }
  return res
}

/** Fill n slots by drawing from the pool (deterministic when given a seed, for email). */
export function fill(pool: Swatch[], n: number, seed?: number): Swatch[] {
  let s = seed ?? Math.floor(Math.random() * 2 ** 31)
  const rand = () => { s = (s * 1103515245 + 12345) % 2 ** 31; return s / 2 ** 31 }
  return Array.from({ length: n }, () => pool[Math.floor(rand() * pool.length)])
}

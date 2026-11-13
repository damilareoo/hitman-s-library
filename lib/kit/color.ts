// lib/kit/color.ts
// Colour maths from hex, the one value every extraction row stores cleanly:
// OKLCH (via OKLab) for naming and display, WCAG luminance for contrast.

export interface Oklch { l: number; c: number; h: number }

const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16)
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
}

/** OKLab [L, a, b]: Euclidean distance here tracks how different two colours look. */
export function hexToOklab(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map(lin)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = rgb(hex).map(lin)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const c = Math.hypot(A, B)
  const h = c < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360
  return { l: Math.min(1, Math.max(0, L)), c, h }
}

const r1 = (n: number) => Math.round(n * 10) / 10
const r3 = (n: number) => Math.round(n * 1000) / 1000

/** A readable OKLCH string: oklch(75.4% 0.178 59.2). Greys print as 0 0. */
export function formatOklch(o: Oklch): string {
  const grey = o.c < 0.0015
  return `oklch(${r1(o.l * 100)}% ${grey ? 0 : r3(o.c)} ${grey ? 0 : r1(o.h)})`
}

export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map(lin)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100
}

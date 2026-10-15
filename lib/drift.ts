// lib/drift.ts
// Design-drift math (Phase 1). Client-safe: culori only, no node imports.
//
// Everything behind DRIFT_ENABLED. Set NEXT_PUBLIC_DRIFT_ENABLED=0 to kill
// the History tab, the badge, and the changelog per-site section in one
// place — reads and writes underneath keep working.
export const DRIFT_ENABLED = process.env.NEXT_PUBLIC_DRIFT_ENABLED !== '0'

/**
 * Visual similarity search (Phase 2): History-tab-style kill switch for the
 * Similar action, the neighbor grid, and the /similar API. Reads resolve
 * through the same flag server-side.
 */
export const SIMILAR_ENABLED = process.env.NEXT_PUBLIC_SIMILAR_ENABLED !== '0'

import { parse, differenceEuclidean } from 'culori'

const diff = differenceEuclidean('oklch')

/** Same perceptual bar as dedup: within 0.05 in OKLCH is the same colour. */
const SAME_COLOR_DISTANCE = 0.05

/**
 * Initial badge bar, pending the 20-site manual calibration in the Phase 1
 * acceptance check. Half the palette turning over, any heading/body/mono
 * family swap, or a screenshot hash more than ~19% of bits apart counts as
 * a redesign.
 */
export const DRIFT_TURNOVER_THRESHOLD = 0.5
export const DRIFT_HAMMING_THRESHOLD = 12

export interface PaletteColor {
  hex: string
  oklch: string
}

export interface TypoEntry {
  fontFamily: string
  role: string
  primaryWeight: number
}

function colorDistance(a: string, b: string): number {
  try {
    const pa = parse(a)
    const pb = parse(b)
    if (!pa || !pb) return Number.POSITIVE_INFINITY
    return diff(pa, pb)
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

/** Greedy nearest-match pairing; unmatched entries are appeared/vanished. */
export function paletteDiff(
  before: PaletteColor[],
  after: PaletteColor[],
): { appeared: PaletteColor[]; vanished: PaletteColor[] } {
  const remaining = [...after]
  const vanished: PaletteColor[] = []
  for (const old of before) {
    let best = -1
    let bestDist = Number.POSITIVE_INFINITY
    for (let i = 0; i < remaining.length; i++) {
      const d = colorDistance(old.oklch || old.hex, remaining[i].oklch || remaining[i].hex)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    if (best >= 0 && bestDist < SAME_COLOR_DISTANCE) remaining.splice(best, 1)
    else vanished.push(old)
  }
  return { appeared: remaining, vanished }
}

export interface TypoChange {
  role: string
  beforeFamily: string | null
  afterFamily: string | null
  beforeWeight: number | null
  afterWeight: number | null
  familyChanged: boolean
  weightChanged: boolean
}

export function typographyDiff(before: TypoEntry[], after: TypoEntry[]): TypoChange[] {
  const roles = [...new Set([...before.map(t => t.role), ...after.map(t => t.role)])].sort()
  return roles.map(role => {
    const b = before.find(t => t.role === role)
    const a = after.find(t => t.role === role)
    const beforeFamily = b?.fontFamily ?? null
    const afterFamily = a?.fontFamily ?? null
    return {
      role,
      beforeFamily,
      afterFamily,
      beforeWeight: b?.primaryWeight ?? null,
      afterWeight: a?.primaryWeight ?? null,
      familyChanged:
        beforeFamily !== null &&
        afterFamily !== null &&
        beforeFamily.toLowerCase() !== afterFamily.toLowerCase(),
      weightChanged:
        b?.primaryWeight != null &&
        a?.primaryWeight != null &&
        b.primaryWeight !== a.primaryWeight,
    }
  })
}

/** Hamming distance between two 16-hex-char dHashes; null when uncomparable. */
export function hammingDistance(a: string | null, b: string | null): number | null {
  if (!a || !b || a.length !== 16 || b.length !== 16) return null
  try {
    let dist = 0
    for (let i = 0; i < 16; i++) {
      let xor = parseInt(a[i], 16) ^ parseInt(b[i], 16)
      while (xor) {
        dist += xor & 1
        xor >>= 1
      }
    }
    return dist
  } catch {
    return null
  }
}

export interface DriftResult {
  appeared: PaletteColor[]
  vanished: PaletteColor[]
  typoChanges: TypoChange[]
  /** Share of the combined palette that turned over, 0..1. */
  paletteTurnover: number
  screenshotChanged: boolean | null
  redesigned: boolean
}

export function driftBetween(
  before: { palette: PaletteColor[]; typography: TypoEntry[]; screenshotHash?: string | null },
  after: { palette: PaletteColor[]; typography: TypoEntry[]; screenshotHash?: string | null },
): DriftResult {
  const { appeared, vanished } = paletteDiff(before.palette, after.palette)
  const typoChanges = typographyDiff(before.typography, after.typography)
  const total = before.palette.length + after.palette.length
  const paletteTurnover = total === 0 ? 0 : (appeared.length + vanished.length) / total
  const hamming = hammingDistance(before.screenshotHash ?? null, after.screenshotHash ?? null)
  const screenshotChanged = hamming === null ? null : hamming > DRIFT_HAMMING_THRESHOLD
  const redesigned =
    paletteTurnover >= DRIFT_TURNOVER_THRESHOLD ||
    typoChanges.some(c => c.familyChanged) ||
    screenshotChanged === true
  return { appeared, vanished, typoChanges, paletteTurnover, screenshotChanged, redesigned }
}

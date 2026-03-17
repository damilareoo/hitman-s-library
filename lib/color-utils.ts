// lib/color-utils.ts
import { parse, formatHex, oklch as toOklch, formatCss, clampChroma, differenceEuclidean } from 'culori'

export interface ColorFormats {
  hex: string
  oklch: string
}

/**
 * Convert any CSS color string to both HEX and OKLCH CSS strings.
 * Returns null if the input is not a parseable color.
 */
export function toColorFormats(cssColor: string): ColorFormats | null {
  try {
    const parsed = parse(cssColor)
    if (!parsed) return null

    const hex = formatHex(parsed)
    if (!hex) return null

    const clamped = clampChroma(toOklch(parsed), 'oklch')
    if (!clamped) return null

    const oklchStr = formatCss(clamped)
    if (!oklchStr) return null

    return { hex, oklch: oklchStr }
  } catch {
    return null
  }
}

// culori's differenceEuclidean in oklch space is perceptually appropriate
const diff = differenceEuclidean('oklch')

/**
 * Deduplicate an array of CSS color strings by perceptual similarity.
 * Colors within euclidean distance 0.05 in OKLCH space are considered duplicates.
 */
export function deduplicateColors(colors: string[]): string[] {
  const result: string[] = []
  for (const color of colors) {
    const parsed = parse(color)
    if (!parsed) continue
    const isTooSimilar = result.some(existing => {
      const existingParsed = parse(existing)
      if (!existingParsed) return false
      try { return diff(parsed, existingParsed) < 0.05 } catch { return false }
    })
    if (!isTooSimilar) result.push(color)
  }
  return result
}

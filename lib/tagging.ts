// lib/tagging.ts
// The cleaned tag set (work order A9). Tags are computed from extracted data
// — never from HTML keyword sniffing, which is how `animated` ended up on
// 80% of the library and `glassmorphism` on 58%.
//
// Kept tags and their bars (coverage measured 2026-10-15, n=232):
//   dark   (52) — background ground lightness <= 0.45 in OKLCH
//   serif  (27) — a heading or body face matching the serif family list
//   dense  (71) — palette >= 12 colors AND >= 5 assets
//   sparse (18) — palette <= 4 colors AND <= 2 assets
//
// Deliberately absent, with reasons:
//   light  — 160+ grounds read light; a filter matching two thirds of the
//            library is not a filter. Light is the default, dark is the tag.
//   sans   — 204 sites carry a sans face; same objection.
//   motion — 85% of pages carry some transition, 50% run animations. The
//            signal lives in metadata.motion for future filtering instead.
//   <anything else> — pruned as an everywhere-tag above 30% coverage.
// Thresholds are documented, not tuned to flatter the count: if growth
// pushes dense past 80, raise its bars rather than splitting hairs.
import { parse } from 'culori'

export interface TagPaletteColor {
  oklch: string
  areaShare?: number | null
}

const SERIF_FAMILIES =
  /serif|garamond|georgia|times|playfair|merriweather|lora|bodoni|didot|caslon|baskerville|slab|charter|source serif|pt serif|noto serif|eb garamond|cormorant|fraunces/i

/** The cleaned, filterable tag set — mirrors lib/tagging.ts output. */
export const FILTER_TAGS = ['dark', 'serif', 'dense', 'sparse'] as const
export function groundLightness(palette: TagPaletteColor[]): number | null {
  let best: number | null = null
  let bestW = -1
  for (const c of palette) {
    try {
      const p = parse(c.oklch)
      if (!p || p.mode !== 'oklch' || typeof p.l !== 'number') continue
      const w = typeof c.areaShare === 'number' ? c.areaShare : 0
      if (w > bestW) {
        bestW = w
        best = p.l
      }
    } catch { /* unparseable — skip */ }
  }
  if (best === null && palette.length > 0) {
    try {
      const p = parse(palette[0].oklch)
      if (p && p.mode === 'oklch' && typeof p.l === 'number') best = p.l
    } catch { /* skip */ }
  }
  return best
}

export function computeTags(args: {
  palette: TagPaletteColor[]
  fontFamilies: string[]
  colorCount: number
  assetCount: number
}): string[] {
  const tags: string[] = []
  const ground = groundLightness(args.palette)
  if (ground !== null && ground <= 0.45) tags.push('dark')
  const fams = args.fontFamilies.filter(Boolean)
  if (fams.some(f => SERIF_FAMILIES.test(f))) tags.push('serif')
  if (args.colorCount >= 12 && args.assetCount >= 5) tags.push('dense')
  else if (args.colorCount <= 4 && args.assetCount <= 2) tags.push('sparse')
  return tags
}

// lib/color-distance.ts
// Color neighborhoods: how close one hex sits to another in OKLCH.
//
// OKLCH distances match human perception far better than RGB math, so a
// "near this color" grid groups palettes the way an eye would. The same
// numbers drive the prototype's color travel, so the two stay in lockstep.
import { parse, oklch as toOklch, clampChroma } from 'culori'
import type { Design } from '@/components/design-card'

export interface OklchColor {
  l: number // 0..1 — distance math runs on culori's native scale, like the prototype
  c: number
  h: number // degrees
}

/** sRGB hex → OKLCH. Null for anything culori cannot read. */
export function hexToOklch(hex: string): OklchColor | null {
  try {
    const parsed = parse(hex)
    if (!parsed) return null
    const converted = clampChroma(toOklch(parsed), 'oklch')
    if (!converted) return null
    const c = converted.c ?? 0
    // culori leaves hue undefined (or a meaningless 180) on achromatic
    // colors; a hue of 0 is the honest value there.
    const h = c < 0.0005 || !Number.isFinite(converted.h) ? 0 : (converted.h as number)
    return { l: converted.l ?? 0, c, h }
  } catch {
    return null
  }
}

/** A palette within this distance of the target color is "near" it. */
export const COLOR_RADIUS = 0.1
/** Color grids cap here, like every other result set. */
export const COLOR_CAP = 60

/** Colors the filter accepts: the 3- and 6-digit hexes the library stores. */
export function isHexColor(raw: string | null | undefined): raw is string {
  return Boolean(raw && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw))
}

export function colorDistance(a: OklchColor, b: OklchColor): number {
  const ax = a.c * Math.cos((a.h * Math.PI) / 180)
  const ay = a.c * Math.sin((a.h * Math.PI) / 180)
  const bx = b.c * Math.cos((b.h * Math.PI) / 180)
  const by = b.c * Math.sin((b.h * Math.PI) / 180)
  return Math.hypot(a.l - b.l, ax - bx, ay - by)
}

/**
 * Sites ordered by how close their palettes sit to a target color. A site's
 * distance is its nearest swatch — a palette that contains the color outright
 * ranks ahead of one that merely brushes past it.
 */
export function rankDesignsByColor(
  designs: Design[],
  hex: string,
  radius = COLOR_RADIUS,
  cap = COLOR_CAP,
): Design[] {
  const target = hexToOklch(hex)
  if (!target) return []
  const ranked: { design: Design; dist: number }[] = []
  for (const design of designs) {
    let best = Infinity
    for (const color of design.colors) {
      const oklch = hexToOklch(color)
      if (!oklch) continue
      const dist = colorDistance(target, oklch)
      if (dist < best) best = dist
    }
    if (best <= radius) ranked.push({ design, dist: best })
  }
  ranked.sort((a, b) => a.dist - b.dist)
  return ranked.slice(0, cap).map(r => r.design)
}

// lib/kit/roles.ts
//
// What each colour does on the site, read from measurement rather than
// guessed: the largest light colour is the background, the darkest is the
// text, the most chromatic is the accent, the rest support. Shared by the
// style kit and the Pro contrast filter.
import type { SiteColor } from '@/lib/read/site-detail'

export type ColorRole = 'background' | 'text' | 'accent' | 'support'

export function parseOklch(s: string | null): { l: number; c: number; h: number } | null {
  const m = s?.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/i)
  if (!m) return null
  const l = parseFloat(m[1]) / (m[2] ? 100 : 1)
  return { l: Math.round(l * 1e4) / 1e4, c: parseFloat(m[3]), h: parseFloat(m[4]) }
}

/** sRGB relative luminance from hex — the fallback when a row has no OKLCH. */
function lightness(c: SiteColor): number {
  const o = parseOklch(c.oklch)
  if (o) return o.l
  const n = parseInt(c.hex_value.slice(1), 16)
  return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255
}

export function colorRoles(colors: SiteColor[]): Map<string, ColorRole> {
  const roles = new Map<string, ColorRole>()
  if (!colors.length) return roles
  const light = colors.filter(c => lightness(c) >= 0.8)
  const bg = [...(light.length ? light : colors)].sort((a, b) => (b.area_share ?? 0) - (a.area_share ?? 0))[0]
  roles.set(bg.hex_value, 'background')
  const rest = colors.filter(c => c !== bg)
  const text = [...rest].sort((a, b) => lightness(a) - lightness(b))[0]
  if (text) roles.set(text.hex_value, 'text')
  const accent = rest.filter(c => c !== text).sort((a, b) => (parseOklch(b.oklch)?.c ?? 0) - (parseOklch(a.oklch)?.c ?? 0))[0]
  if (accent && (parseOklch(accent.oklch)?.c ?? 0) > 0.05) roles.set(accent.hex_value, 'accent')
  for (const c of colors) if (!roles.has(c.hex_value)) roles.set(c.hex_value, 'support')
  return roles
}

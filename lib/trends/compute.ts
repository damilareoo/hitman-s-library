// lib/trends/compute.ts
//
// Trends: what the newest sites do differently from the ones before them.
// The last 30 days of additions against everything added earlier, so a rise
// is a real rise. System fallback faces (Georgia, SFMono…) are not design
// choices and never count. Pure; the loader
// feeds it one row per site (when added, its fonts, its colours largest-area
// first, its kind).
import { hsl } from '@/lib/pro/palette'

export interface TrendSite { addedAt: string; fonts: string[]; colors: string[]; kind: string }
export interface Share { recent: number; earlier: number }
export interface Trends {
  recentCount: number
  earlierCount: number
  serif: Share
  dark: Share
  fonts: { name: string; recent: number; earlier: number }[]
  hues: { name: string; recent: number; earlier: number }[]
  kinds: { name: string; recent: number; earlier: number }[]
}

const SYSTEM = /^(sfmono|sf mono|sf pro|menlo|monaco|consolas|courier|georgia|times|times new roman|arial|helvetica|helvetica neue|system-ui|-apple-system|blinkmacsystemfont|segoe ui|roboto|ui-monospace|ui-sans-serif|ui-serif|monospace|sans-serif|serif|liberation|dejavu)/i
export const isSystemFont = (font: string) => SYSTEM.test(font.trim())

const SERIFS = /serif|playfair|garamond|georgia|times|fraunces|newsreader|lora|merriweather|baskerville|caslon|cormorant|crimson|tiempos|sectra|canela|domaine|ogg|recoleta|editorial|didot|bodoni|freight|lyon|spectral|literata|source serif|pt serif|ibm plex serif|gt alpina|reckless|signifier/i
export const isSerif = (font: string) => !isSystemFont(font) && SERIFS.test(font) && !/sans/i.test(font)

const FAMILIES: [string, number][] = [['Red', 10], ['Orange', 45], ['Yellow', 70], ['Green', 160], ['Teal', 195], ['Blue', 250], ['Purple', 290], ['Pink', 340], ['Red', 360]]
export function hueFamily(hex: string): string {
  const [h, s, l] = hsl(hex)
  if (s < 0.25 || l < 0.12 || l > 0.92) return 'Neutral'
  return FAMILIES.find(([, upTo]) => h < upTo)?.[0] ?? 'Red'
}

/** A site's accent: its most saturated colour that isn't near black or white. */
function accentOf(colors: string[]): string | null {
  let best: string | null = null, bestS = 0.25
  for (const c of colors) { const [, s, l] = hsl(c); if (l > 0.12 && l < 0.92 && s > bestS) { best = c; bestS = s } }
  return best
}

const share = (n: number, of: number) => (of ? n / of : 0)

export function computeTrends(sites: TrendSite[], now = new Date()): Trends {
  const cutoff = now.getTime() - 30 * 864e5
  const clean = sites.map(s => ({ ...s, fonts: s.fonts.filter(f => !isSystemFont(f)) }))
  const recent = clean.filter(s => new Date(s.addedAt).getTime() > cutoff)
  const earlier = clean.filter(s => new Date(s.addedAt).getTime() <= cutoff)
  const count = <K extends string>(list: TrendSite[], keys: (s: TrendSite) => K[]) => {
    const m = new Map<K, number>()
    for (const s of list) for (const k of new Set(keys(s))) m.set(k, (m.get(k) ?? 0) + 1)
    return m
  }
  const table = (keys: (s: TrendSite) => string[], asShare: boolean, top: number) => {
    const r = count(recent, keys), e = count(earlier, keys)
    return [...new Set([...r.keys(), ...e.keys()])]
      .map(name => ({ name, recent: asShare ? share(r.get(name) ?? 0, recent.length) : r.get(name) ?? 0, earlier: asShare ? share(e.get(name) ?? 0, earlier.length) : e.get(name) ?? 0 }))
      .sort((a, b) => b.recent - a.recent || b.earlier - a.earlier)
      .slice(0, top)
  }
  const pct = (pred: (s: TrendSite) => boolean): Share => ({
    recent: share(recent.filter(pred).length, recent.length),
    earlier: share(earlier.filter(pred).length, earlier.length),
  })
  return {
    recentCount: recent.length,
    earlierCount: earlier.length,
    serif: pct(s => s.fonts.some(isSerif)),
    dark: pct(s => Boolean(s.colors[0]) && hsl(s.colors[0])[2] < 0.3),
    fonts: table(s => s.fonts, false, 8),
    hues: table(s => { const a = accentOf(s.colors); return a ? [hueFamily(a)] : [] }, true, 8),
    kinds: table(s => [s.kind], true, 6),
  }
}

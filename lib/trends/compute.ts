// lib/trends/compute.ts
//
// Trends: what the newest sites do differently from the ones before them.
// The last 30 days of additions against everything added earlier, so a rise
// is a real rise. System fallback faces (Georgia, SFMono…) are not design
// choices and never count. Each typeface and colour row brings three of the
// newest sites that show it, so a trend can be seen, not just read. Pure; the
// loader feeds it one row per site.
import { hsl } from '@/lib/pro/palette'
import { hexToOklab } from '@/lib/tokens/color'

export interface TrendSite { id?: number; slug?: string; thumb?: string | null; addedAt: string; fonts: string[]; colors: string[]; kind: string }
export interface Example { slug: string; thumb: string | null }
export interface Share { recent: number; earlier: number }
export interface TrendRow { name: string; recent: number; earlier: number; examples: Example[] }
export interface Trends {
  recentCount: number
  earlierCount: number
  serif: Share
  dark: Share
  /** Counts of sites using each face (not shares). */
  fonts: TrendRow[]
  /** Shares of sites by accent family; hex is a real accent from the family, for search. */
  hues: (TrendRow & { hex: string | null })[]
}

export { isSystemFont, isSerif } from '@/lib/tokens/font-kind'
import { isSystemFont, isSerif } from '@/lib/tokens/font-kind'

const FAMILIES: [string, number][] = [['Red', 10], ['Orange', 45], ['Yellow', 70], ['Green', 160], ['Teal', 195], ['Blue', 250], ['Purple', 290], ['Pink', 340], ['Red', 360]]
/** The typical shade of each family, for picking a representative real accent. */
const TYPICAL: Record<string, string> = { Red: '#d9412b', Orange: '#e8862a', Yellow: '#e2b52a', Green: '#3f9d5a', Teal: '#2a9d9a', Blue: '#2f6be0', Purple: '#7a4fd6', Pink: '#d65a9a' }
const dist = (a: string, b: string) => { const x = hexToOklab(a), y = hexToOklab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) }

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
  // Newest first, so examples are the latest sites showing each trend.
  const newest = [...recent].sort((x, y) => y.addedAt.localeCompare(x.addedAt))
  const examplesOf = (keys: (s: TrendSite) => string[], name: string): Example[] =>
    newest.filter(x => x.slug && keys(x).includes(name)).slice(0, 3).map(x => ({ slug: x.slug!, thumb: x.thumb ?? null }))
  const table = (keys: (s: TrendSite) => string[], asShare: boolean, top: number): TrendRow[] => {
    const r = count(recent, keys), e = count(earlier, keys)
    return [...new Set([...r.keys(), ...e.keys()])]
      .map(name => ({ name, recent: asShare ? share(r.get(name) ?? 0, recent.length) : r.get(name) ?? 0, earlier: asShare ? share(e.get(name) ?? 0, earlier.length) : e.get(name) ?? 0, examples: examplesOf(keys, name) }))
      .sort((a, b) => b.recent - a.recent || b.earlier - a.earlier)
      .slice(0, top)
  }
  const pct = (pred: (s: TrendSite) => boolean): Share => ({
    recent: share(recent.filter(pred).length, recent.length),
    earlier: share(earlier.filter(pred).length, earlier.length),
  })
  const family = (x: TrendSite) => { const a = accentOf(x.colors); return a ? [hueFamily(a)] : [] }
  return {
    recentCount: recent.length,
    earlierCount: earlier.length,
    serif: pct(x => x.fonts.some(isSerif)),
    dark: pct(x => Boolean(x.colors[0]) && hsl(x.colors[0])[2] < 0.3),
    fonts: table(x => x.fonts, false, 8),
    // A real accent from the family, the one nearest its typical shade, so the
    // search it opens finds the family rather than one odd tint of it.
    hues: table(family, true, 9).map(row => {
      const accents = clean.map(x => accentOf(x.colors)).filter((c): c is string => Boolean(c) && hueFamily(c!) === row.name)
      const typical = TYPICAL[row.name]
      const hex = typical && accents.length ? accents.reduce((best, c) => (dist(c, typical) < dist(best, typical) ? c : best)) : null
      return { ...row, hex }
    }),
  }
}

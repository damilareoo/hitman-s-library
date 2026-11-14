// lib/search/search.ts
//
// Pro search over a compact index of the library: every site's colours, fonts
// and best text contrast. Pure functions — the route loads the index (cached
// at the edge) and asks these for ids, so the Worker does a few thousand
// subtractions per query and nothing heavier.
import { hexToOklab, contrastRatio } from '@/lib/tokens/color'
import { isSystemFont, isSerif, isMono, isSans } from '@/lib/tokens/font-kind'

type Lab = [number, number, number]
/** labs: each colour in OKLab, worked out once when the index is built (and cached with it). */
export interface SearchEntry { id: number; colors: string[]; fonts: string[]; contrast: number | null; labs?: Lab[] }
export interface SearchQuery { palette: string[]; font: string; contrast: 'AA' | 'AAA' | null; empty: boolean }

const HEX = /^#?([0-9a-f]{6})$/i
const NOT_A_FONT = new Set(['true', 'false', 'null', 'undefined', 'inherit', 'initial'])
/** How far (in OKLab) a site's nearest colour may sit from each colour asked for. */
export const PALETTE_RADIUS = 0.1
export const MAX_PALETTE = 6

export function buildSearchIndex(designs: { id: string | number; colors: string[]; typography: string[] }[]): SearchEntry[] {
  return designs.map(d => {
    const colors = d.colors.map(c => HEX.exec((c ?? '').trim())).filter((m): m is RegExpExecArray => !!m).map(m => '#' + m[1].toLowerCase())
    const fonts = d.typography.map(f => (f ?? '').trim()).filter(f => f.length > 1 && !NOT_A_FONT.has(f.toLowerCase()) && !isSystemFont(f))
    // Colours come largest area first: the background, then the colour that
    // covers most of what sits on it (usually the text). Measuring against the
    // best-reading colour instead let nearly every site pass, since almost all
    // carry a black or white somewhere.
    const contrast = colors.length > 1 ? contrastRatio(colors[0], colors[1]) : null
    const labs = colors.map(c => hexToOklab(c).map(v => Math.round(v * 1e4) / 1e4) as Lab)
    return { id: Number(d.id), colors, fonts, contrast, labs }
  })
}

export function parseSearchQuery(params: URLSearchParams): SearchQuery {
  const palette = [...new Set((params.get('palette') ?? '').split(',')
    .map(s => HEX.exec(s.trim())).filter((m): m is RegExpExecArray => !!m)
    .map(m => '#' + m[1].toLowerCase()))].slice(0, MAX_PALETTE)
  const rawFont = (params.get('font') ?? '').trim().toLowerCase()
  const font = rawFont.length <= 40 ? rawFont : ''
  const c = params.get('contrast')
  const contrast = c === 'AA' || c === 'AAA' ? c : null
  return { palette, font, contrast, empty: !palette.length && !font && !contrast }
}

const KINDS: Record<string, (f: string) => boolean> = { serif: isSerif, sans: isSans, 'sans-serif': isSans, mono: isMono, monospace: isMono }

const dist = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/** Matching ids, best first: by palette closeness when a palette is given, otherwise library order. */
export function searchIndex(index: SearchEntry[], q: SearchQuery): number[] {
  const want = q.palette.map(hexToOklab)
  const min = q.contrast === 'AAA' ? 7 : q.contrast === 'AA' ? 4.5 : 0
  const hits: { id: number; score: number; order: number }[] = []
  index.forEach((e, order) => {
    // "serif", "sans" and "mono" mean a kind of typeface; anything else is a name.
    const kind = KINDS[q.font]
    if (q.font && !(kind ? e.fonts.some(kind) : e.fonts.some(f => f.toLowerCase().includes(q.font)))) return
    if (min && (e.contrast == null || e.contrast < min)) return
    let score = 0
    if (want.length) {
      if (!e.colors.length) return
      const labs = e.labs ?? e.colors.map(hexToOklab)
      for (const w of want) {
        const d = Math.min(...labs.map(l => dist(w, l)))
        if (d > PALETTE_RADIUS) return
        score += d
      }
      score /= want.length
    }
    hits.push({ id: e.id, score, order })
  })
  return hits.sort((a, b) => a.score - b.score || a.order - b.order).map(h => h.id)
}

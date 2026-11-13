// lib/search/refine-params.ts
// Refine filters live in the URL (?pal=ff5526,111111&font=inter&readable=AA)
// so a refined view can be shared and the back button works.
export interface RefineQuery { palette: string[]; font: string; readable: '' | 'AA' | 'AAA' }

export function refineFromParams(p: URLSearchParams): RefineQuery {
  const palette = [...new Set((p.get('pal') ?? '').split(',').map(s => s.trim().toLowerCase().replace(/^#/, '')).filter(s => /^[0-9a-f]{6}$/.test(s)))].slice(0, 6).map(s => '#' + s)
  const r = p.get('readable')
  return { palette, font: (p.get('font') ?? '').trim().slice(0, 40), readable: r === 'AA' || r === 'AAA' ? r : '' }
}

export function refineToParams(q: RefineQuery, p: URLSearchParams): void {
  p.delete('pal'); p.delete('font'); p.delete('readable')
  if (q.palette.length) p.set('pal', q.palette.map(c => c.replace('#', '')).join(','))
  if (q.font.trim()) p.set('font', q.font.trim())
  if (q.readable) p.set('readable', q.readable)
}

/** The Pro search API's query string for these filters. */
export function refineApiQuery(q: RefineQuery): string {
  const s = new URLSearchParams()
  if (q.palette.length) s.set('palette', q.palette.join(','))
  if (q.font.trim()) s.set('font', q.font.trim())
  if (q.readable) s.set('contrast', q.readable)
  return s.toString()
}

export const refineActive = (q: RefineQuery) => q.palette.length > 0 || q.font.trim() !== '' || q.readable !== ''

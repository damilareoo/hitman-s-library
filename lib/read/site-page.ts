// lib/read/site-page.ts
// What a site's own page (/site/plastic.audio) tells search engines and link
// cards: name, kind, its palette in plain hex, its typefaces, and a cropped
// image. Built from stored rows only; the panel still loads the full detail.
import { cache } from 'react'
import { getSql } from '@/lib/db'
import { resolveSite } from '@/lib/read/resolve-site'
import { getSiteDetail } from '@/lib/read/site-detail'
import { nameColors } from '@/lib/tokens/roles'
import { kitFonts } from '@/lib/tokens/files'
import { displayKind, UNSORTED } from '@/lib/categories'
import { getDomain } from '@/lib/get-domain'

export interface SitePage {
  id: string
  /** The name alone: "Cotool", not "Cotool — AI SOC and Agent-Native SIEM". */
  name: string
  slug: string
  title: string
  url: string
  domain: string
  kind: string | null
  image: string | null
  addedAt: string
  /** Named palette, background and text first. */
  colors: { name: string; role: string; hex: string }[]
  fonts: { role: string; family: string }[]
}

const toHttps = (u: unknown) => (typeof u === 'string' && u ? u.replace(/^http:\/\//, 'https://') : null)

/** One lookup per request, shared by the metadata and the page body. */
export const loadSitePage = cache(async (slug: string): Promise<SitePage | null> => {
  const resolved = await resolveSite(slug).catch(() => null)
  if (!resolved) return null
  const id = Number(resolved.id)
  const [detail, rows] = await Promise.all([
    getSiteDetail(id),
    getSql()`SELECT kind, thumbnail_optimized_url, thumbnail_url FROM design_sources WHERE id = ${id}`,
  ])
  if (!detail) return null
  const row: any = rows[0] ?? {}
  const colors = nameColors(detail.colors).map(c => ({ name: c.name, role: c.role, hex: c.hex }))
  const fonts = kitFonts(detail).map(f => ({ role: f.role, family: f.family }))
  return {
    id: resolved.id,
    slug: resolved.slug,
    name: siteName(resolved.title, detail.url),
    title: resolved.title,
    url: detail.url,
    domain: getDomain(detail.url),
    kind: row.kind && row.kind !== UNSORTED ? displayKind(row.kind) : null,
    image: toHttps(row.thumbnail_optimized_url) ?? toHttps(row.thumbnail_url) ?? detail.screenshot_url,
    addedAt: detail.created_at,
    colors,
    fonts,
  }
})

/**
 * What to call a site in a title or a post. Page titles are often taglines
 * ("Selected work", "Home", "Build AI that works."), so the cut title is used
 * only when it plausibly names the site: one of its words appears in the
 * address, or the address's name appears in it. Otherwise, the domain.
 */
export function siteName(title: string, url: string): string {
  const name = shortName(title)
  let host = ''
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, '') } catch { return name }
  const label = host.split('.').slice(0, -1).join('').replace(/[^a-z0-9]/g, '')
  const compact = name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')
  const words = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(w => w.length >= 3)
  // A name is short (three words at most) and not a sentence; a match in the
  // host counts, a match only in the path ("drum-pad") does not.
  const shape = name.length <= 32 && name.trim().split(/\s+/).length <= 3 && !/[.!?]$/.test(name)
  const fits = shape && ((label.length >= 3 && compact.includes(label)) || words.some(w => host.includes(w)))
  return fits ? name.replace(/^www\./i, '') : host
}

/** A page title cut to the name before its tagline. */
export function shortName(title: string): string {
  const cut = title.split(/\s+[—–|·:-]\s+|:\s+/)[0].trim()
  return cut.length >= 2 ? cut : title
}

/** "Background #0b0b0c, text #f4f4f5, accent #5e6ad2. Set in Inter." */
export function describeSite(s: SitePage): string {
  const by = (r: string) => s.colors.find(c => c.role === r)?.hex
  const parts: string[] = []
  const roles = (['background', 'text', 'accent'] as const).map(r => [r, by(r)] as const).filter(([, h]) => h)
  if (roles.length) parts.push(roles.map(([r, h]) => `${r} ${h}`).join(', ').replace(/^./, c => c.toUpperCase()) + '.')
  const families = [...new Set(s.fonts.map(f => f.family))]
  if (families.length) parts.push(`Set in ${families.slice(0, 2).join(' and ')}.`)
  return parts.join(' ')
}

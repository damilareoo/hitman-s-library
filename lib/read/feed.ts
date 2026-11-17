// lib/read/feed.ts
// The newest sites as plain facts, for /feed.xml: name, page, palette, fonts,
// card. Feed readers, automations and posting bots read it; every value is
// measured, so anything written from it is true.
import { getSql } from '@/lib/db'
import { cleanTitle } from '@/lib/clean-title'
import { siteSlug } from '@/lib/site-slug'
import { nameColors } from '@/lib/tokens/roles'
import { siteName } from '@/lib/read/site-page'
import { displayKind, UNSORTED } from '@/lib/categories'

export interface FeedItem {
  id: number; name: string; slug: string; url: string; kind: string | null
  addedAt: string; card: string | null
  colors: { role: string; hex: string }[]
  fonts: { role: string; family: string }[]
}

const NOT_A_FONT = /^(true|false|null|undefined|inherit|initial|unset|normal|none|serif|sans-serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace)$/i

/** "suisseIntl" → "Suisse Intl"; "fontSeasonSans" → "Season Sans". */
export function prettyFont(family: string): string {
  const spaced = family.replace(/_+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim().replace(/^font\s+(?=\S+\s+\S)/i, '')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export async function loadFeed(limit = 30): Promise<FeedItem[]> {
  const sql = getSql()
  const sites = await sql`
    SELECT ds.id, ds.source_url, ds.source_name, ds.created_at, ds.kind, sc.image_url AS card
    FROM design_sources ds LEFT JOIN site_cards sc ON sc.source_id = ds.id
    WHERE ds.screenshot_url IS NOT NULL
    ORDER BY ds.created_at DESC LIMIT ${limit}
  `
  const ids = (sites as any[]).map(s => s.id as number)
  if (!ids.length) return []
  const [colors, fonts] = await Promise.all([
    sql`SELECT source_id, hex_value, oklch, area_share FROM design_colors WHERE source_id = ANY(${ids})`,
    sql`SELECT source_id, font_family, role FROM design_typography WHERE source_id = ANY(${ids}) AND role IN ('heading', 'body', 'mono')
        ORDER BY CASE role WHEN 'heading' THEN 1 WHEN 'body' THEN 2 ELSE 3 END`,
  ])
  const group = <T>(rows: any[], f: (r: any) => T | null) => {
    const m = new Map<number, T[]>()
    for (const r of rows) { const v = f(r); if (v) (m.get(r.source_id) ?? m.set(r.source_id, []).get(r.source_id)!).push(v) }
    return m
  }
  const colorsBy = group(colors as any[], r => r)
  const fontsBy = group(fonts as any[], r => {
    const family = String(r.font_family ?? '').replace(/^["']|["']$/g, '').trim()
    return family.length >= 2 && !NOT_A_FONT.test(family) ? { role: r.role as string, family: prettyFont(family) } : null
  })
  return (sites as any[]).map(s => {
    const seen = new Set<string>()
    return {
      id: s.id,
      name: siteName(cleanTitle(s.source_name, s.source_url), s.source_url),
      slug: siteSlug(s.source_url),
      url: s.source_url,
      kind: s.kind && s.kind !== UNSORTED ? displayKind(s.kind) : null,
      addedAt: new Date(s.created_at).toISOString(),
      card: s.card ?? null,
      colors: nameColors(colorsBy.get(s.id) ?? []).map(c => ({ role: c.role, hex: c.hex })),
      fonts: (fontsBy.get(s.id) ?? []).filter(f => !seen.has(f.family) && seen.add(f.family)),
    }
  })
}

/** "Background #ffffff, text #000000, accent #030de9. Set in Moderat and Suisse Intl." */
export function describeItem(i: FeedItem): string {
  const by = (r: string) => i.colors.find(c => c.role === r)?.hex
  const parts: string[] = []
  const roles = (['background', 'text', 'accent'] as const).map(r => [r, by(r)] as const).filter(([, h]) => h)
  if (roles.length) parts.push(roles.map(([r, h]) => `${r} ${h}`).join(', ').replace(/^./, c => c.toUpperCase()) + '.')
  if (i.fonts.length) parts.push(`Set in ${i.fonts.slice(0, 2).map(f => f.family).join(' and ')}.`)
  return parts.join(' ')
}

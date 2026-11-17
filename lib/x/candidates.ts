// lib/x/candidates.ts
// Every site as the daily post sees it, from stored rows. Shared by the cron
// route (which sends) and scripts/x-card.ts (which renders the image first),
// so both pick the same site for the same day.
import { cleanTitle } from '@/lib/clean-title'
import { siteSlug } from '@/lib/site-slug'
import { nameColors } from '@/lib/tokens/roles'
import { siteName } from '@/lib/read/site-page'
import type { Candidate } from './compose'

const NOT_A_FONT = /^(true|false|null|undefined|inherit|initial|unset|normal|none|serif|sans-serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace)$/i

export interface CandidateRow extends Candidate { url: string; screenshotUrl: string }

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>

export async function loadCandidates(sql: Sql): Promise<CandidateRow[]> {
  const [sites, colors, fonts] = await Promise.all([
    sql`
      SELECT ds.id, ds.source_url, ds.source_name, ds.created_at, ds.screenshot_url,
             (SELECT max(p.posted_at) FROM x_posts p WHERE p.source_id = ds.id AND p.tweet_id IS NOT NULL) AS last_posted_at
      FROM design_sources ds
      WHERE ds.screenshot_url IS NOT NULL
    `,
    sql`SELECT source_id, hex_value, oklch, area_share FROM design_colors`,
    sql`SELECT source_id, font_family, role FROM design_typography WHERE role IN ('heading', 'body', 'mono')`,
  ])
  const colorsBy = new Map<number, any[]>()
  for (const c of colors as any[]) (colorsBy.get(c.source_id) ?? colorsBy.set(c.source_id, []).get(c.source_id)!).push(c)
  const fontsBy = new Map<number, { role: string; family: string }[]>()
  for (const f of fonts as any[]) {
    const family = String(f.font_family ?? '').replace(/^["']|["']$/g, '').trim()
    if (family.length < 2 || NOT_A_FONT.test(family)) continue
    ;(fontsBy.get(f.source_id) ?? fontsBy.set(f.source_id, []).get(f.source_id)!).push({ role: f.role, family })
  }
  return (sites as any[]).map(s => ({
    id: s.id,
    url: s.source_url,
    screenshotUrl: String(s.screenshot_url).replace(/^http:\/\//, 'https://'),
    name: siteName(cleanTitle(s.source_name, s.source_url), s.source_url),
    slug: siteSlug(s.source_url),
    addedAt: new Date(s.created_at).toISOString(),
    colors: nameColors(colorsBy.get(s.id) ?? []).map(c => ({ role: c.role, hex: c.hex })),
    fonts: fontsBy.get(s.id) ?? [],
    lastPostedAt: s.last_posted_at ? new Date(s.last_posted_at).toISOString() : null,
  }))
}

/** Today's send time, 14:00 UTC, or a given ISO day at that hour. */
export function postTime(day?: string | null): Date {
  const d = day && !Number.isNaN(Date.parse(day)) ? day.slice(0, 10) : new Date().toISOString().slice(0, 10)
  return new Date(d + 'T14:00:00Z')
}

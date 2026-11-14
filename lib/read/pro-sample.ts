// lib/read/pro-sample.ts
// The real example the Pro page shows to people who haven't joined: this
// month's trend findings, and the exact theme.css an AI tool gets for one
// featured site (the newest site with a full palette and named typefaces).
// Public library data only; nothing invented.
import { getSql } from '@/lib/db'
import { siteSlug } from '@/lib/site-slug'
import { trendsCached } from '@/lib/trends/load'
import { findings } from '@/lib/email/trends-briefing'
import { getSiteDetail } from '@/lib/read/site-detail'
import { buildTokenFiles } from '@/lib/tokens/files'

export interface ProSample { site: { slug: string } | null; themeCss: string | null; trends: string[] }

export async function loadProSample(): Promise<ProSample> {
  const sql = getSql()
  const [pick] = await sql`
    SELECT ds.id FROM design_sources ds
     WHERE ds.screenshot_url IS NOT NULL
       AND (SELECT count(*) FROM design_colors c WHERE c.source_id = ds.id) >= 5
       AND (SELECT count(*) FROM design_typography t WHERE t.source_id = ds.id AND t.font_family IS NOT NULL) >= 2
     ORDER BY ds.created_at DESC LIMIT 1`
  const [detail, trends] = await Promise.all([
    pick ? getSiteDetail(Number(pick.id)).catch(() => null) : Promise.resolve(null),
    trendsCached().then(findings).catch(() => [] as string[]),
  ])
  const css = detail ? buildTokenFiles(detail).find(f => f.name === 'theme.css')?.content ?? null : null
  return {
    site: detail ? { slug: siteSlug(detail.url) } : null,
    // The first lines are enough to show what arrives; the rest is the same shape.
    themeCss: css ? css.split('\n').slice(0, 12).join('\n') : null,
    trends,
  }
}

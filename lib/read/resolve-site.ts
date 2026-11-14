// lib/read/resolve-site.ts
// ?site= from the address bar to a library site: a name (plastic.audio,
// vercel.com/design/guidelines) or an old numeric id.
import { getSql } from '@/lib/db'
import { cleanTitle } from '@/lib/clean-title'
import { siteSlug, isSiteId } from '@/lib/site-slug'

export interface ResolvedSite { id: string; slug: string; title: string }

export async function resolveSite(param: string): Promise<ResolvedSite | null> {
  const p = param.trim().toLowerCase()
  if (!p || p.length > 300) return null
  const sql = getSql()
  const rows = isSiteId(p)
    ? await sql`SELECT id, source_url, source_name FROM design_sources WHERE id = ${Number(p)}`
    // The host narrows it to a handful of rows; the exact slug picks one.
    : await sql`SELECT id, source_url, source_name FROM design_sources WHERE source_url ILIKE ${'%' + p.split('/')[0] + '%'} LIMIT 25`
  const row = isSiteId(p) ? rows[0] : rows.find(r => siteSlug(String(r.source_url)) === p)
  if (!row) return null
  return { id: String(row.id), slug: siteSlug(String(row.source_url)), title: cleanTitle(row.source_name, row.source_url) }
}

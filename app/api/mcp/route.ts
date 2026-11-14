// app/api/mcp/route.ts
// Hitman's Library for AI tools (MCP over HTTP). Protocol and tests live in
// lib/mcp/server.ts; this file connects it to the library. Read-only, Pro
// keys only, 60 calls a minute per key.
import { handleMcp, type SiteSummary, type SearchArgs } from '@/lib/mcp/server'
import { hashKey, looksLikeKey } from '@/lib/mcp/keys'
import { getSql } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { problem } from '@/lib/auth/request'
import { queryDesigns, queryDesignsByIds } from '@/lib/design-queries'
import { searchIndexCached } from '@/lib/search/load'
import { searchIndex } from '@/lib/search/search'
import { resolveSite } from '@/lib/read/resolve-site'
import { getSiteDetail } from '@/lib/read/site-detail'
import { buildKitFiles } from '@/lib/kit/kit'
import { siteSlug } from '@/lib/site-slug'
import { displayKind } from '@/lib/categories'

const SITE = 'https://hitmanslibrary.xyz'

function summary(d: { url: string; title: string; kind: string; colors: string[]; typography: string[] }): SiteSummary {
  return { site: siteSlug(d.url), name: d.title, url: d.url, kind: displayKind(d.kind), colors: d.colors.slice(0, 8), fonts: d.typography.slice(0, 3) }
}

async function search(a: SearchArgs): Promise<SiteSummary[]> {
  const limit = a.limit ?? 10
  const kind = a.kind?.toLowerCase()
  if (a.palette?.length || a.font || a.readable) {
    const ids = searchIndex(await searchIndexCached(), {
      palette: (a.palette ?? []).map(c => c.trim().toLowerCase()).filter(c => /^#?[0-9a-f]{6}$/.test(c)).map(c => (c.startsWith('#') ? c : '#' + c)),
      font: (a.font ?? '').toLowerCase(), contrast: a.readable ?? null, empty: false,
    })
    const rows = await queryDesignsByIds(ids.slice(0, 60))
    const q = a.query?.toLowerCase()
    return rows
      .filter(d => !kind || displayKind(d.kind).toLowerCase() === kind)
      .filter(d => !q || `${d.title} ${d.url} ${d.kind} ${d.tags.join(' ')}`.toLowerCase().includes(q))
      .slice(0, limit).map(summary)
  }
  const { designs } = await queryDesigns({ search: a.query ?? '', kinds: [], sortBy: 'recent', limit: 60, offset: 0 })
  return designs.filter(d => !kind || displayKind(d.kind).toLowerCase() === kind).slice(0, limit).map(summary)
}

async function detailFor(ref: string) {
  const resolved = await resolveSite(/^https?:\/\//i.test(ref) ? siteSlug(ref) : ref)
  if (!resolved) return null
  return getSiteDetail(Number(resolved.id))
}

export async function POST(req: Request) {
  try {
    return await handleMcp(req, {
      auth: async key => {
        if (!looksLikeKey(key)) return null
        const sql = getSql()
        const [row] = await sql`
          SELECT k.id, k.user_id FROM api_keys k JOIN pro_users p ON p.user_id = k.user_id
           WHERE k.key_hash = ${await hashKey(key)} AND k.revoked_at IS NULL`
        if (!row) return null
        // At most one write an hour per key, just to show "last used".
        await sql`UPDATE api_keys SET last_used_at = now() WHERE id = ${row.id} AND (last_used_at IS NULL OR last_used_at < now() - interval '1 hour')`.catch(() => {})
        return { userId: String(row.user_id), keyId: String(row.id) }
      },
      allowed: async keyId => (await checkRateLimit(`key:${keyId}`, 'mcp', 60, 60)).ok,
      search,
      site: async ref => {
        const d = await detailFor(ref)
        if (!d) return null
        const total = d.colors.reduce((s, c) => s + (c.area_share ?? 0), 0)
        return {
          site: siteSlug(d.url), name: d.title, url: d.url, page: `${SITE}/?site=${encodeURIComponent(siteSlug(d.url))}`,
          colors: d.colors.map(c => ({ hex: c.hex_value, oklch: c.oklch, share: total > 0 && c.area_share != null ? Math.round((c.area_share / total) * 100) / 100 : null })),
          fonts: d.typography.map(t => ({ family: t.font_family, role: t.role, weight: t.primary_weight, size: t.sample_size_px })),
          captures: { desktop: d.screenshot_url, mobile: d.mobile_screenshot_url },
        }
      },
      kit: async ref => {
        const d = await detailFor(ref)
        return d ? { site: siteSlug(d.url), files: buildKitFiles(d) } : null
      },
    })
  } catch (err) {
    console.error('[POST /api/mcp]', err)
    return problem(500, 'unavailable')
  }
}

export async function GET() {
  return new Response(JSON.stringify({ error: 'This MCP server answers POST only.' }), { status: 405, headers: { allow: 'POST', 'content-type': 'application/json' } })
}

// lib/trends/load.ts
// One row per listed site for the trends report: when it was added, its fonts,
// its colours (largest area first) and its kind. Same sources as the search
// index. The computed report is kept in Cloudflare's cache for six hours.
import { getSql } from '@/lib/db'
import { computeTrends, type Trends, type TrendSite } from './compute'
import { siteSlug } from '@/lib/site-slug'
import { toHttps } from '@/lib/secure-url'

export async function loadTrendSites(): Promise<TrendSite[]> {
  const rows = await getSql()`
    SELECT ds.id, ds.source_url, ds.created_at, ds.kind,
      COALESCE(ds.thumbnail_optimized_url, ds.screenshot_url) AS thumb,
      COALESCE(
        (SELECT array_agg(p->>'hex' ORDER BY ord)
           FROM extraction_history eh, jsonb_array_elements(CASE WHEN jsonb_typeof(eh.palette) = 'array' THEN eh.palette ELSE '[]'::jsonb END) WITH ORDINALITY AS t(p, ord)
          WHERE eh.id = ds.current_extraction_id AND p->>'hex' IS NOT NULL),
        ARRAY(SELECT hex_value FROM design_colors WHERE source_id = ds.id AND hex_value IS NOT NULL ORDER BY id LIMIT 8)
      ) AS colors,
      COALESCE(
        (SELECT array_agg(DISTINCT t->>'fontFamily')
           FROM extraction_history eh, jsonb_array_elements(CASE WHEN jsonb_typeof(eh.typography) = 'array' THEN eh.typography ELSE '[]'::jsonb END) t
          WHERE eh.id = ds.current_extraction_id AND t->>'fontFamily' IS NOT NULL),
        ARRAY(SELECT DISTINCT font_family FROM design_typography WHERE source_id = ds.id AND role != 'legacy' AND font_family IS NOT NULL LIMIT 3)
      ) AS fonts
    FROM design_sources ds
    WHERE ds.screenshot_url IS NOT NULL`
  return rows.map(r => ({
    id: Number(r.id),
    slug: siteSlug(String(r.source_url)),
    thumb: toHttps(r.thumb) ?? null,
    addedAt: new Date(r.created_at).toISOString(),
    kind: String(r.kind ?? 'Other'),
    colors: ((r.colors ?? []) as string[]).filter(c => /^#[0-9a-f]{6}$/i.test(c)),
    fonts: ((r.fonts ?? []) as string[]).filter(f => f && f.length > 1 && !/^(true|false|null|inherit)$/i.test(f)),
  }))
}

const KEY = 'https://hitmanslibrary.xyz/__internal/trends/v2'

export async function trendsCached(): Promise<Trends> {
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default
  if (cache) {
    const hit = await cache.match(KEY).catch(() => undefined)
    if (hit) return hit.json() as Promise<Trends>
  }
  const t = computeTrends(await loadTrendSites())
  if (cache) await cache.put(KEY, new Response(JSON.stringify(t), { headers: { 'content-type': 'application/json', 'Cache-Control': 'public, max-age=21600' } })).catch(() => {})
  return t
}

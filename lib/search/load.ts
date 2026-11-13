// lib/search/load.ts
//
// The Pro search index: every listed site's colours (largest area first) and
// typefaces, in one compact query. It follows the grid's rule exactly: the
// current extraction snapshot when there is one, the older per-site tables
// otherwise. Kept in Cloudflare's cache for ten minutes, so a search costs a
// cache read and a few thousand subtractions, not a library-wide query.
import { getSql } from '@/lib/db'
import { buildSearchIndex, type SearchEntry } from './search'

export async function loadSearchIndex(): Promise<SearchEntry[]> {
  const rows = await getSql()`
    SELECT ds.id,
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
    WHERE ds.screenshot_url IS NOT NULL
    ORDER BY ds.created_at DESC`
  return buildSearchIndex(rows.map(r => ({ id: r.id, colors: r.colors ?? [], typography: r.fonts ?? [] })))
}

const CACHE_KEY = 'https://hitmanslibrary.xyz/__internal/pro-search-index/v2'
const TTL_SECONDS = 600

// The parsed index, kept for a minute in this isolate, so back-to-back
// searches skip even the cache read and JSON parse.
let memo: { at: number; index: SearchEntry[] } | null = null
const MEMO_MS = 60_000

/** The index from Cloudflare's cache, rebuilt at most every ten minutes. */
export async function searchIndexCached(): Promise<SearchEntry[]> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.index
  const index = await fromCache()
  memo = { at: Date.now(), index }
  return index
}

async function fromCache(): Promise<SearchEntry[]> {
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default
  if (cache) {
    const hit = await cache.match(CACHE_KEY).catch(() => undefined)
    if (hit) return hit.json() as Promise<SearchEntry[]>
  }
  const index = await loadSearchIndex()
  if (cache) {
    await cache.put(CACHE_KEY, new Response(JSON.stringify(index), {
      headers: { 'content-type': 'application/json', 'Cache-Control': `public, max-age=${TTL_SECONDS}` },
    })).catch(() => {})
  }
  return index
}

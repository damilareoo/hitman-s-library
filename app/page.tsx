import { resolveSite } from '@/lib/read/resolve-site'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Gallery } from '@/components/gallery'
import { queryDesigns, type SortBy } from '@/lib/design-queries'
import { queryCategoriesCached, queryAllSitesIndex } from '@/lib/design-queries-cached'
import { getDomain } from '@/lib/get-domain'
import { SIMILAR_ENABLED, querySimilar } from '@/lib/similarity'
import { rankDesignsByColor, COLOR_RADIUS, COLOR_CAP, isHexColor } from '@/lib/color-distance'

// The grid ships as HTML for crawlers and first paint either way, but
// `force-dynamic` made *every* visit pay a full SSR inside the Worker. On the
// free plan that render exceeds the per-request CPU ceiling and Cloudflare
// answers 503 "error code: 1102" for a share of visitors. Cached at the edge,
// one request per interval pays it and the rest never reach the Worker.
export const revalidate = 300

const LIMIT = 32

// No 'top' — the Top control went when sorting moved beside the result count,
// and a slug the interface cannot show or clear is a state you get stuck in.
const SLUG_TO_SORT: Record<string, SortBy> = {
  new: 'recent',
  old: 'oldest',
  az: 'name',
}

type SearchParams = Record<string, string | string[] | undefined>

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<SearchParams> },
): Promise<Metadata> {
  const params = await searchParams
  const categories = toArray(params.category)
  const q = typeof params.q === 'string' ? params.q : ''
  const colorHex = typeof params.color === 'string' && isHexColor(params.color) ? params.color.toLowerCase() : null

  // Filtered views are near-duplicates of the index — describe them, don't index them.
  const isFiltered = categories.length > 0 || Boolean(q) || Boolean(params.tag) || Boolean(params.site) || Boolean(params.similarTo) || Boolean(colorHex)

  let title = "Hitman's Library"
  const siteParam = typeof params.site === 'string' ? params.site : ''
  const site = siteParam ? await resolveSite(siteParam).catch(() => null) : null
  if (site) title = `${site.title} · Hitman's Library`
  else if (q) title = `Search: ${q}`
  else if (colorHex) title = `Near ${colorHex}`
  else if (categories.length === 1) title = `${categories[0]} design references`

  return {
    title,
    alternates: { canonical: '/' },
    robots: isFiltered ? { index: false, follow: true } : { index: true, follow: true },
  }
}

export default async function Page(
  { searchParams }: { searchParams: Promise<SearchParams> },
) {
  const params = await searchParams

  const sortParam = typeof params.sort === 'string' ? params.sort : ''
  const similarToRaw = typeof params.similarTo === 'string' ? params.similarTo : ''
  const similarToId = SIMILAR_ENABLED ? parseInt(similarToRaw, 10) : NaN
  const rawColor = typeof params.color === 'string' ? params.color : ''
  const colorHex = isHexColor(rawColor) ? rawColor.toLowerCase() : null
  const siteParam = typeof params.site === 'string' ? params.site : ''
  const [{ designs, pagination }, categories, initialSimilar, initialSite] = await Promise.all([
    // A color view ships ranked as HTML, like every other view — the same
    // rows the client-side ranking would land on.
    colorHex ? queryColorRanked(colorHex) : queryDesigns({
      kinds: toArray(params.category),
      tags: toArray(params.tag),
      search: typeof params.q === 'string' ? params.q : '',
      sortBy: SLUG_TO_SORT[sortParam] ?? 'recent',
      limit: LIMIT,
      offset: 0,
    }),
    queryCategoriesCached(),
    // The neighbor grid ships as HTML too, with the open site pinned first —
    // the same rows the client fetch would land on.
    Number.isFinite(similarToId) ? querySimilar(similarToId, 24) : Promise.resolve(null),
    // ?site= may be a name (plastic.audio) or an old id; the panel needs the id.
    siteParam ? resolveSite(siteParam).catch(() => null) : Promise.resolve(null),
  ])

  return (
    <Suspense fallback={null}>
      <Gallery
        // The client rewrites the query string through the history API so a
        // click never costs a server round trip; these are the params the
        // first (server) render was painted from.
        initialParams={params}
        initialSite={initialSite}
        initialDesigns={initialSimilar && initialSimilar.site ? [initialSimilar.site, ...initialSimilar.neighbors] : designs}
        initialPagination={
          initialSimilar && initialSimilar.site
            ? { total: initialSimilar.neighbors.length + 1, hasMore: false, offset: 0 }
            : {
              total: pagination.total,
              hasMore: pagination.hasMore,
              offset: pagination.offset,
            }
        }
        initialCategories={categories}
        initialSimilar={initialSimilar}
        initialColor={colorHex}
      />

      {/* Crawlable index of the full collection. The gallery above paginates as
          you scroll, so this guarantees every site is reachable from the HTML. */}
      <AllSitesIndex />
    </Suspense>
  )
}

/** The whole library, ranked by palette proximity to one color. */
async function queryColorRanked(hex: string) {
  type DesignRow = Awaited<ReturnType<typeof queryDesigns>>['designs'][number]
  const seen = new Map<string, DesignRow>()
  let offset = 0
  for (let page = 0; page < 4; page++) {
    const { designs: batch, pagination } = await queryDesigns({ sortBy: 'recent', limit: 100, offset })
    for (const d of batch) seen.set(d.id, d)
    if (!batch.length || !pagination.hasMore) break
    offset += batch.length
  }
  const ranked = rankDesignsByColor([...seen.values()], hex, COLOR_RADIUS, COLOR_CAP)
  return { designs: ranked, pagination: { total: ranked.length, hasMore: false, offset: 0, limit: LIMIT } }
}

async function AllSitesIndex() {
  const sites = await queryAllSitesIndex()

  return (
    <nav aria-label="All sites" className="sr-only">
      <h2>Sites in the library</h2>
      <ul>
        {sites.map(site => (
          <li key={site.id}>
            <a href={site.url} rel="noopener noreferrer">
              {site.title} — {getDomain(site.url)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

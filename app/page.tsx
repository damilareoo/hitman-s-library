import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Gallery } from '@/components/gallery'
import {
  queryDesigns,
  queryCategoriesCached,
  queryAllSitesIndex,
  type SortBy,
} from '@/lib/design-queries'
import { getDomain } from '@/lib/get-domain'

// Rendered per request so the grid ships as HTML — crawlers and first paint
// both get real content instead of an empty shell.
export const dynamic = 'force-dynamic'

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

  // Filtered views are near-duplicates of the index — describe them, don't index them.
  const isFiltered = categories.length > 0 || Boolean(q) || Boolean(params.tag) || Boolean(params.site)

  let title = "Hitman's Library"
  if (q) title = `Search: ${q}`
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
  const [{ designs, pagination }, categories] = await Promise.all([
    queryDesigns({
      industries: toArray(params.category),
      tags: toArray(params.tag),
      search: typeof params.q === 'string' ? params.q : '',
      sortBy: SLUG_TO_SORT[sortParam] ?? 'recent',
      limit: LIMIT,
      offset: 0,
    }),
    queryCategoriesCached(),
  ])

  return (
    <Suspense fallback={null}>
      <Gallery
        initialDesigns={designs}
        initialPagination={{
          total: pagination.total,
          hasMore: pagination.hasMore,
          offset: pagination.offset,
        }}
        initialCategories={categories}
      />

      {/* Crawlable index of the full collection. The gallery above paginates as
          you scroll, so this guarantees every site is reachable from the HTML. */}
      <AllSitesIndex />
    </Suspense>
  )
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

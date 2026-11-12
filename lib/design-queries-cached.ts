// lib/design-queries-cached.ts
//
// The Next data-cache wrappers around library-wide queries. Kept apart from
// lib/design-queries.ts so that module stays free of next/* imports: the
// Worker fast path reuses it and must not load Next.
import { unstable_cache } from 'next/cache'
import { loadAllSitesIndex, loadBrowseIndex, queryCategories } from './design-queries'

/**
 * The gallery paginates as you scroll, so this list is what guarantees every
 * site is reachable from the HTML.
 */
export const queryAllSitesIndex = unstable_cache(loadAllSitesIndex, ['all-sites-index'], { revalidate: 3600, tags: ['designs'] })

/**
 * Category counts change only when a site is added or removed, so serving them
 * a few minutes stale costs nothing and takes a query off the render path.
 */
export const queryCategoriesCached = unstable_cache(queryCategories, ['categories'], { revalidate: 300, tags: ['designs'] })

/** The whole library as a search index for the browse panel. */
export const queryBrowseIndex = unstable_cache(loadBrowseIndex, ['browse-index'], { revalidate: 120, tags: ['designs'] })

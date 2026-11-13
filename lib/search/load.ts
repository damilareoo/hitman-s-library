// lib/search/load.ts
// The search index, built from the same rows the grid lists and kept in the
// Next data cache for ten minutes (and dropped when the library changes), so
// a Pro search costs a cache read, not a library-wide query.
import { unstable_cache } from 'next/cache'
import { queryDesigns } from '@/lib/design-queries'
import { buildSearchIndex, type SearchEntry } from './search'

async function loadSearchIndex(): Promise<SearchEntry[]> {
  const rows: { id: string; colors: string[]; typography: string[] }[] = []
  for (let offset = 0, page = 0; page < 20; page++) {
    const { designs, pagination } = await queryDesigns({ ids: [], kinds: [], tags: [], search: '', sortBy: 'recent', limit: 100, offset })
    rows.push(...designs)
    if (!pagination.hasMore || !designs.length) break
    offset += designs.length
  }
  return buildSearchIndex(rows)
}

export const searchIndexCached = unstable_cache(loadSearchIndex, ['pro-search-index'], { revalidate: 600, tags: ['designs'] })

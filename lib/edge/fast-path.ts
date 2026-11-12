// lib/edge/fast-path.ts
//
// Which requests the Worker entry can answer without loading Next. Only the two
// hottest public reads qualify; everything else goes to Next unchanged.
// parseListQuery is also what the Next route uses, so both paths read a query
// the same way.
import type { SortBy } from '@/lib/design-queries'
import { parseId } from '@/lib/parse-id'
import { isPreviewHost } from './security-headers'

export interface ListQuery {
  ids: number[]
  kinds: string[]
  tags: string[]
  search: string
  sortBy: SortBy
  limit: number
  offset: number
}

export type FastRoute = { kind: 'site'; id: number } | { kind: 'list'; query: ListQuery }

const VALID_SORTS: readonly SortBy[] = ['recent', 'oldest', 'name', 'quality']
const SITE = /^\/api\/design\/([^/]+)$/

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = parseInt(raw ?? '', 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

export function parseListQuery(params: URLSearchParams): ListQuery {
  const sort = params.get('sortBy') as SortBy | null
  return {
    // '' .split(',') is [''], and Number('') is 0 — drop empties first.
    ids: (params.get('ids') ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '')
      .map(Number)
      // Postgres int range only: 1.5 or 3000000000 would fail the ::int[] cast.
      .filter(n => Number.isSafeInteger(n) && n > 0 && n <= 2_147_483_647)
      .slice(0, 200),
    kinds: params.getAll('kind'),
    tags: params.getAll('tag'),
    search: params.get('search') ?? '',
    sortBy: sort && VALID_SORTS.includes(sort) ? sort : 'recent',
    limit: clampInt(params.get('limit'), 32, 1, 100),
    offset: clampInt(params.get('offset'), 0, 0, 100_000),
  }
}

export function matchFastPath(method: string, url: URL): FastRoute | null {
  if (method !== 'GET') return null
  // The preview host serves the proxy and nothing else (middleware.ts);
  // leave it to Next so that rule holds here too.
  if (isPreviewHost(url.host)) return null
  if (url.pathname === '/api/design/filter-advanced') return { kind: 'list', query: parseListQuery(url.searchParams) }
  const site = SITE.exec(url.pathname)
  const id = site ? parseId(site[1]) : null
  return id === null ? null : { kind: 'site', id }
}

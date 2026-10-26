// lib/design-queries.ts
// Single source of truth for reading the library.
//
// Both the server-rendered gallery and /api/design/filter-advanced call these,
// so the first paint and every subsequent fetch cannot drift apart.
import { unstable_cache } from 'next/cache'
import { toHttps } from '@/lib/secure-url'
import { getSql } from '@/lib/db'
import { cleanTitle, decodeEntities } from './clean-title'
import { getHistoriesByIds } from './extraction-history'
import { DRIFT_ENABLED, driftBetween } from './drift'

const sql = getSql()

/**
 * Tag filtering (work order A9): tags are computed from extracted data
 * (lib/tagging.ts) — dark, serif, dense, sparse — each matching a small,
 * useful slice of the library. The old keyword-sniffed tags were pruned as
 * everywhere-tags. While off, `tags` params are ignored.
 */
export const TAG_FILTER_ENABLED = true

export type SortBy = 'recent' | 'oldest' | 'name' | 'quality'

import { KINDS, UNSORTED } from './categories'
export { KINDS, UNSORTED }
export type { Kind } from './categories'

export interface DesignRecord {
  id: string
  url: string
  title: string
  kind: string
  thumbnail_url?: string
  fallback_thumbnail?: string | null
  colors: string[]
  typography: string[]
  layout: string
  quality: number
  tags: string[]
  architecture: string
  addedDate: string
  designStyle?: string
  complexity?: string
  useCase?: string
  /** Hover motion clip URL (Phase 3). Null renders the static screenshot. */
  motion_clip_url?: string | null
  /** True when the newest snapshot drifted beyond threshold vs the previous
   *  one (Phase 1). Absent when drift is disabled or only one snapshot exists. */
  redesigned?: boolean
}

export interface QueryOptions {
  kinds?: string[]
  tags?: string[]
  search?: string
  sortBy?: SortBy
  limit?: number
  offset?: number
  /** Explicit id list (favorites view). Order-preserved, ignores paging. */
  ids?: number[]
}

export interface QueryResult {
  designs: DesignRecord[]
  pagination: { total: number; limit: number; offset: number; hasMore: boolean }
}

/**
 * Blob host for our own captures. Anything else in screenshot_url is a
 * salvaged og:image from before the salvage removal — see mapDesignRecords.
 */
const OWN_CAPTURE_HOST = '.public.blob.vercel-storage.com'

/**
 * Column list shared by every gallery-shaped read, so the card grid, the
 * similar-neighbors grid, and the first paint can never drift apart.
 */
const DESIGN_ROW_SELECT = `
      ds.id,
      ds.source_url,
      ds.source_name,
      ds.kind,
      ds.metadata,
      ds.tags,
      ds.created_at,
      ds.thumbnail_url,
      ds.screenshot_url,
      ds.thumbnail_optimized_url,
      ds.current_extraction_id,
      ds.motion_clip_url,
      (SELECT ARRAY(
        SELECT hex_value FROM design_colors
        WHERE source_id = ds.id AND hex_value IS NOT NULL
        ORDER BY id LIMIT 8
      )) AS hex_colors,
      (SELECT ARRAY(
        SELECT DISTINCT font_family FROM design_typography
        WHERE source_id = ds.id AND role != 'legacy' AND font_family IS NOT NULL
        LIMIT 3
      )) AS font_families
`

const SORT_CLAUSES: Record<SortBy, string> = {
  recent: 'ds.created_at DESC',
  oldest: 'ds.created_at ASC',
  name: 'ds.source_name ASC',
  quality: "(ds.metadata->>'quality')::int DESC NULLS LAST, ds.created_at DESC",
}

function parseTags(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return raw.split(',').map(t => t.trim()).filter(Boolean)
    }
  }
  return []
}

/**
 * Some thumbnail URLs were scraped out of HTML attributes and stored with their
 * entities intact ("?auto=format&amp;fit=crop"), which makes them 404. Decode on
 * read so existing rows work without a migration.
 */
function cleanUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw) return null
  return toHttps(decodeEntities(raw))
}

function parseMetadata(raw: unknown): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  if (typeof raw === 'object') return raw as Record<string, any>
  return {}
}

export async function queryDesigns(opts: QueryOptions = {}): Promise<QueryResult> {
  const {
    kinds = [],
    tags = [],
    search = '',
    sortBy = 'recent',
    limit = 32,
    offset = 0,
    ids = [],
  } = opts
  // Explicit id list short-circuits every other filter.
  if (ids.length > 0) {
    const designs = await queryDesignsByIds(ids.filter(Number.isFinite))
    return {
      designs,
      pagination: { total: designs.length, limit: designs.length, offset: 0, hasMore: false },
    }
  }

  const sortClause = SORT_CLAUSES[sortBy] ?? SORT_CLAUSES.recent

  // Only surface sites that have a screenshot — those are ready to preview.
  const whereConditions: string[] = ['ds.screenshot_url IS NOT NULL']
  const filterParams: any[] = []

  if (kinds.length > 0 && !kinds.includes('all')) {
    const placeholders = kinds.map((_, i) => `$${filterParams.length + i + 1}`).join(',')
    // A site with no kind yet answers to Unsorted, so nothing is unreachable.
    whereConditions.push(`COALESCE(ds.kind, '${UNSORTED}') IN (${placeholders})`)
    filterParams.push(...kinds)
  }

  if (tags.length > 0 && TAG_FILTER_ENABLED) {
    // tags is TEXT[]; && is "arrays overlap", i.e. matches any selected tag.
    whereConditions.push(`ds.tags && $${filterParams.length + 1}::text[]`)
    filterParams.push(tags)
  }

  if (search) {
    const idx = filterParams.length + 1
    // Domain, title, and kind: the three things a visitor means by a query.
    whereConditions.push(`(ds.source_name ILIKE $${idx} OR ds.source_url ILIKE $${idx} OR COALESCE(ds.kind, '${UNSORTED}') ILIKE $${idx})`)
    filterParams.push(`%${search}%`)
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`

  const mainQuery = `
    SELECT ${DESIGN_ROW_SELECT}
    FROM design_sources ds
    ${whereClause}
    ORDER BY ${sortClause}
    LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}
  `

  const countQuery = `SELECT COUNT(*) as total FROM design_sources ds ${whereClause}`

  const [results, countResult] = await Promise.all([
    sql.query(mainQuery, [...filterParams, limit, offset]),
    sql.query(countQuery, filterParams),
  ])

  const total = parseInt(countResult[0]?.total ?? '0', 10)

  // Resolve through the current-extraction pointer (Phase 0). Rows whose
  // pointer is set render the pointed-to snapshot; rows without one (written
  // before the history table existed) render their legacy tables unchanged.
  const historyIds = results
    .map((row: any) => row.current_extraction_id)
    .filter((v: unknown): v is number => typeof v === 'number')
  const histories = await getHistoriesByIds(historyIds)

  // "Redesigned" badges (Phase 1): newest snapshot vs the previous one, one
  // extra query for the page. Never allowed to break the gallery.
  const redesignedBySite = await fetchRedesignedMap(results.map((row: any) => Number(row.id)).filter(Number.isFinite))

  const designs = mapDesignRecords(results, histories, redesignedBySite)

  return {
    designs,
    pagination: { total, limit, offset, hasMore: offset + limit < total },
  }
}

/** "Redesigned" badges: newest snapshot vs the previous one per site. */
export async function fetchRedesignedMap(siteIds: number[]): Promise<Map<number, boolean>> {
  const out = new Map<number, boolean>()
  if (!DRIFT_ENABLED || siteIds.length === 0) return out
  try {
    const recent = await sql`
      SELECT site_id, palette, typography, screenshot_hash, captured_at, id FROM (
        SELECT site_id, palette, typography, screenshot_hash, captured_at, id,
               ROW_NUMBER() OVER (PARTITION BY site_id ORDER BY captured_at DESC, id DESC) AS rn
        FROM extraction_history
        WHERE site_id = ANY(${siteIds}::int[])
      ) s WHERE rn <= 2
    `
    const bySite = new Map<number, any[]>()
    for (const row of recent) {
      const list = bySite.get(Number(row.site_id)) ?? []
      list.push(row)
      bySite.set(Number(row.site_id), list)
    }
    for (const [siteId, rows] of bySite) {
      if (rows.length < 2) continue
      const [newest, prev] = rows
      const drift = driftBetween(
        {
          palette: Array.isArray(prev.palette) ? prev.palette : [],
          typography: Array.isArray(prev.typography) ? prev.typography : [],
          screenshotHash: typeof prev.screenshot_hash === 'string' ? prev.screenshot_hash : null,
        },
        {
          palette: Array.isArray(newest.palette) ? newest.palette : [],
          typography: Array.isArray(newest.typography) ? newest.typography : [],
          screenshotHash: typeof newest.screenshot_hash === 'string' ? newest.screenshot_hash : null,
        },
      )
      if (drift.redesigned) out.set(siteId, true)
    }
  } catch (err) {
    console.error('[design-queries] drift badges failed:', err)
  }
  return out
}

function mapDesignRecords(
  results: any[],
  histories: Map<number, import('./extraction-history').ExtractionSnapshot>,
  redesignedBySite: Map<number, boolean>,
): DesignRecord[] {
  return results.map((row: any) => {
    const metadata = parseMetadata(row.metadata)
    const snapshot = typeof row.current_extraction_id === 'number'
      ? histories.get(row.current_extraction_id)
      : undefined
    // A salvaged og:image promoted into screenshot_url is not a capture of
    // the page (six such rows predate the salvage removal) — and two of them
    // are animated GIFs that would autoplay in the grid at full size. Only a
    // blob URL counts as a capture; anything else drops to thumbnail duty.
    const capture = typeof row.screenshot_url === 'string' && row.screenshot_url.includes(OWN_CAPTURE_HOST)
      ? cleanUrl(row.screenshot_url)
      : null
    const salvaged = !capture ? cleanUrl(row.screenshot_url) : null
    // Snapshots copy whatever the row held — including a salvaged og:image
    // where the row never had a capture. Same blob check as below.
    const snapCapture = typeof snapshot?.screenshot_url === 'string' && snapshot.screenshot_url.includes(OWN_CAPTURE_HOST)
      ? cleanUrl(snapshot.screenshot_url)
      : null
    const snapSalvaged = !snapCapture ? cleanUrl(snapshot?.screenshot_url) : null
    const legacyColors: string[] = Array.isArray(row.hex_colors) ? row.hex_colors.filter(Boolean) : []
    const legacyType: string[] = Array.isArray(row.font_families) ? row.font_families.filter(Boolean) : []
    return {
      id: String(row.id),
      url: row.source_url,
      title: cleanTitle(row.source_name, row.source_url),
      kind: row.kind || UNSORTED,
      // The re-encoded thumbnail leads where it exists; the hotlink is the
      // last resort and disappears as the backfill covers each row.
      thumbnail_url: snapCapture || capture || cleanUrl(row.thumbnail_optimized_url) || snapSalvaged || salvaged || cleanUrl(row.thumbnail_url) || undefined,
      fallback_thumbnail: (snapCapture || capture) ? cleanUrl(row.thumbnail_optimized_url) || snapSalvaged || salvaged || cleanUrl(row.thumbnail_url) : null,
      colors: snapshot ? snapshot.palette.map(p => p.hex).filter(Boolean) : legacyColors,
      typography: snapshot
        ? [...new Set(snapshot.typography.map(t => t.fontFamily).filter(Boolean))].slice(0, 3)
        : legacyType,
      layout: metadata.layout || 'Standard',
      designStyle: metadata.designStyle || 'Modern',
      architecture: metadata.architecture || 'Custom',
      quality: metadata.quality || 5,
      complexity: metadata.complexity,
      useCase: metadata.useCase,
      tags: parseTags(row.tags),
      addedDate: new Date(row.created_at).toISOString(),
      motion_clip_url: typeof row.motion_clip_url === 'string' && row.motion_clip_url ? row.motion_clip_url : null,
      ...(redesignedBySite.get(Number(row.id)) ? { redesigned: true as const } : {}),
    }
  })
}

/**
 * Full card rows for an explicit id list, order-preserved. Feeds the
 * similar-neighbors grid so it renders exactly like the main grid.
 */
export async function queryDesignsByIds(ids: number[]): Promise<DesignRecord[]> {
  if (ids.length === 0) return []
  // Main rows and badges are independent — one round trip saved.
  const [results, redesignedBySite] = await Promise.all([
    sql.query(
      `SELECT ${DESIGN_ROW_SELECT} FROM design_sources ds WHERE ds.id = ANY($1::int[])`,
      [ids],
    ),
    fetchRedesignedMap(ids),
  ])
  const historyIds = results
    .map((row: any) => row.current_extraction_id)
    .filter((v: unknown): v is number => typeof v === 'number')
  const histories = await getHistoriesByIds(historyIds)
  const byId = new Map(mapDesignRecords(results, histories, redesignedBySite).map(d => [Number(d.id), d]))
  return ids.map(id => byId.get(id)).filter((d): d is DesignRecord => Boolean(d))
}

export async function queryCategories(): Promise<{ name: string; count: number }[]> {
  const rows = await sql`
    SELECT COALESCE(kind, ${UNSORTED}) AS kind, COUNT(*) as count
    FROM design_sources
    WHERE screenshot_url IS NOT NULL
    GROUP BY 1
  `

  const counts: Record<string, number> = {}
  for (const row of rows) counts[row.kind] = Number(row.count)

  // Fixed order rather than by size. The rail is a list of what the library
  // holds, and a list that reshuffles as sites are added is one you have to
  // read again every visit.
  const ordered = KINDS
    .filter(name => counts[name])
    .map(name => ({ name: name as string, count: counts[name] }))

  if (counts[UNSORTED]) ordered.push({ name: UNSORTED, count: counts[UNSORTED] })
  return ordered
}

/**
 * The crawlable index of the whole collection.
 *
 * The gallery paginates as you scroll, so this list is what guarantees every
 * site is reachable from the HTML. The cap is a runaway guard, not a page
 * size: at 200 it silently dropped the fiftieth-newest sites from the only
 * part of the page a crawler can follow.
 */
export const queryAllSitesIndex = unstable_cache(
  async () => {
    const rows = await sql`
      SELECT id, source_url, source_name
      FROM design_sources
      WHERE screenshot_url IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1000
    `
    return rows.map(row => ({
      id: String(row.id),
      url: row.source_url as string,
      title: cleanTitle(row.source_name, row.source_url),
    }))
  },
  ['all-sites-index'],
  { revalidate: 3600, tags: ['designs'] },
)

/**
 * Category counts change only when a site is added or removed, so serving them
 * a few minutes stale costs nothing and takes a query off the render path.
 */
export const queryCategoriesCached = unstable_cache(
  queryCategories,
  ['categories'],
  { revalidate: 300, tags: ['designs'] },
)

/** One row per site, small enough to keep in the browser for the browse panel. */
export interface BrowseEntry {
  id: string
  title: string
  url: string
  kind: string
  thumb: string | null
  tags: string[]
}

/**
 * The whole library as a search index.
 *
 * The panel scores matches in the browser so typing is instant; a round trip
 * per keystroke would be slower than the thing it is replacing. ~250 rows of
 * five short fields cost a few kilobytes, and the cache means new arrivals
 * show up within a couple of minutes.
 */
export const queryBrowseIndex = unstable_cache(
  async (): Promise<BrowseEntry[]> => {
    const rows = await sql`
      SELECT id, source_url, source_name, kind, tags,
             thumbnail_optimized_url, thumbnail_url
      FROM design_sources
      ORDER BY created_at DESC
      LIMIT 1000
    `
    return rows.map(row => ({
      id: String(row.id),
      title: cleanTitle(row.source_name, row.source_url),
      url: (row.source_url as string) ?? '',
      kind: typeof row.kind === 'string' ? row.kind : '',
      thumb: cleanUrl(row.thumbnail_optimized_url) ?? cleanUrl(row.thumbnail_url),
      tags: parseTags(row.tags),
    }))
  },
  ['browse-index'],
  { revalidate: 120, tags: ['designs'] },
)

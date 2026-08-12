// lib/design-queries.ts
// Single source of truth for reading the library.
//
// Both the server-rendered gallery and /api/design/filter-advanced call these,
// so the first paint and every subsequent fetch cannot drift apart.
import { neon } from '@neondatabase/serverless'
import { cleanTitle, decodeEntities } from './clean-title'

const sql = neon(process.env.DATABASE_URL!)

export type SortBy = 'recent' | 'oldest' | 'name' | 'quality'

export interface DesignRecord {
  id: string
  url: string
  title: string
  industry: string
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
}

export interface QueryOptions {
  industries?: string[]
  tags?: string[]
  search?: string
  sortBy?: SortBy
  limit?: number
  offset?: number
}

export interface QueryResult {
  designs: DesignRecord[]
  pagination: { total: number; limit: number; offset: number; hasMore: boolean }
}

/** Display name → the raw industry values stored in the database. */
export function denormalizeIndustry(name: string): string[] {
  const lower = name.toLowerCase()
  if (lower === 'saas / app') return ['saas', 'productivity', 'saas / app']
  if (lower === 'finance') return ['fintech', 'finance']
  if (lower === 'entertainment') return ['entertainment', 'social media']
  if (lower === 'other') return ['general', 'uncategorized', 'healthcare', 'health', 'travel', 'education', 'code/bugs', 'other', 'c']
  return [lower]
}

/** Raw database industry value → the display name shown in the sidebar. */
export function normalizeIndustry(raw: string): string {
  const s = (raw || '').trim()
  if (/^saas$/i.test(s)) return 'SaaS / App'
  if (/^fintech$/i.test(s)) return 'Finance'
  if (/^productivity$/i.test(s)) return 'SaaS / App'
  if (/^social\s*media$/i.test(s)) return 'Entertainment'
  if (/^health(care|tech)?$/i.test(s)) return 'Other'
  if (/^travel$/i.test(s)) return 'Other'
  if (/^education$/i.test(s)) return 'Other'
  if (/^marketing$/i.test(s)) return 'Marketing'
  if (/^e-commerce$/i.test(s)) return 'E-commerce'
  if (/^entertainment$/i.test(s)) return 'Entertainment'
  if (/^portfolio$/i.test(s)) return 'Portfolio'
  if (/^agency$/i.test(s)) return 'Agency'
  if (/^(general|uncategorized)$/i.test(s)) return 'Other'
  if (/^code[\s/]+bugs$/i.test(s)) return 'Other'
  if (/^[a-z]$/.test(s)) return 'Other'
  if (!s) return 'Other'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

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
  return decodeEntities(raw)
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
    industries = [],
    tags = [],
    search = '',
    sortBy = 'recent',
    limit = 32,
    offset = 0,
  } = opts

  const sortClause = SORT_CLAUSES[sortBy] ?? SORT_CLAUSES.recent

  // Only surface sites that have a screenshot — those are ready to preview.
  const whereConditions: string[] = ['ds.screenshot_url IS NOT NULL']
  const filterParams: any[] = []

  if (industries.length > 0 && !industries.includes('all')) {
    const denormalized = industries.flatMap(denormalizeIndustry)
    const placeholders = denormalized.map((_, i) => `$${filterParams.length + i + 1}`).join(',')
    whereConditions.push(`LOWER(ds.industry) IN (${placeholders})`)
    filterParams.push(...denormalized)
  }

  if (tags.length > 0) {
    // tags is TEXT[]; && is "arrays overlap", i.e. matches any selected tag.
    whereConditions.push(`ds.tags && $${filterParams.length + 1}::text[]`)
    filterParams.push(tags)
  }

  if (search) {
    const idx = filterParams.length + 1
    whereConditions.push(`(ds.source_name ILIKE $${idx} OR ds.source_url ILIKE $${idx})`)
    filterParams.push(`%${search}%`)
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`

  const mainQuery = `
    SELECT
      ds.id,
      ds.source_url,
      ds.source_name,
      ds.industry,
      ds.metadata,
      ds.tags,
      ds.created_at,
      ds.thumbnail_url,
      ds.screenshot_url,
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

  const designs: DesignRecord[] = results.map((row: any) => {
    const metadata = parseMetadata(row.metadata)
    return {
      id: String(row.id),
      url: row.source_url,
      title: cleanTitle(row.source_name, row.source_url),
      industry: normalizeIndustry(row.industry),
      thumbnail_url: cleanUrl(row.screenshot_url) || cleanUrl(row.thumbnail_url) || undefined,
      fallback_thumbnail: row.screenshot_url ? cleanUrl(row.thumbnail_url) : null,
      colors: Array.isArray(row.hex_colors) ? row.hex_colors.filter(Boolean) : [],
      typography: Array.isArray(row.font_families) ? row.font_families.filter(Boolean) : [],
      layout: metadata.layout || 'Standard',
      designStyle: metadata.designStyle || 'Modern',
      architecture: metadata.architecture || 'Custom',
      quality: metadata.quality || 5,
      complexity: metadata.complexity,
      useCase: metadata.useCase,
      tags: parseTags(row.tags),
      addedDate: new Date(row.created_at).toISOString(),
    }
  })

  return {
    designs,
    pagination: { total, limit, offset, hasMore: offset + limit < total },
  }
}

const DEPRIORITIZED = ['Other']

export async function queryCategories(): Promise<{ name: string; count: number }[]> {
  const rows = await sql`
    SELECT industry, COUNT(*) as count
    FROM design_sources
    WHERE screenshot_url IS NOT NULL
    GROUP BY industry
  `

  const merged: Record<string, number> = {}
  for (const row of rows) {
    const key = normalizeIndustry(row.industry || 'Other')
    merged[key] = (merged[key] || 0) + Number(row.count)
  }

  return Object.entries(merged)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      const aLow = DEPRIORITIZED.includes(a.name)
      const bLow = DEPRIORITIZED.includes(b.name)
      if (aLow !== bLow) return aLow ? 1 : -1
      return b.count - a.count
    })
}

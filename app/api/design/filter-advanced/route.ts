import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Maps normalized display names (from categories API) back to raw DB industry values
function denormalize(name: string): string[] {
  const lower = name.toLowerCase()
  if (lower === 'saas / app') return ['saas', 'productivity', 'saas / app']
  if (lower === 'finance') return ['fintech', 'finance']
  if (lower === 'entertainment') return ['entertainment', 'social media']
  if (lower === 'other') return ['general', 'uncategorized', 'healthcare', 'health', 'travel', 'education', 'code/bugs', 'other', 'c']
  return [lower]
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const industries = searchParams.getAll('industry')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'recent'
    const limit = parseInt(searchParams.get('limit') || '500')
    const offset = parseInt(searchParams.get('offset') || '0')

    let sortClause = 'ds.created_at DESC'
    if (sortBy === 'oldest') sortClause = 'ds.created_at ASC'
    else if (sortBy === 'name') sortClause = 'ds.source_name ASC'

    // Only show sites that have a screenshot — they're ready to preview
    const whereConditions: string[] = ['ds.screenshot_url IS NOT NULL']
    const filterParams: any[] = []

    if (industries.length > 0 && !industries.includes('all')) {
      const denormalizedIndustries = industries.flatMap(i => denormalize(i))
      const placeholders = denormalizedIndustries.map((_, i) => `$${i + 1}`).join(',')
      whereConditions.push(`LOWER(ds.industry) IN (${placeholders})`)
      filterParams.push(...denormalizedIndustries)
    }

    if (search) {
      const searchPattern = `%${search}%`
      const paramIndex = filterParams.length + 1
      whereConditions.push(`(ds.source_name ILIKE $${paramIndex} OR ds.source_url ILIKE $${paramIndex})`)
      filterParams.push(searchPattern)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    const limitParamIndex = filterParams.length + 1
    const offsetParamIndex = filterParams.length + 2
    const allParams = [...filterParams, limit, offset]

    // Use only confirmed columns — no optional/backfill columns that may not exist.
    // Colors and typography are fetched via correlated subqueries on guaranteed columns.
    const mainQueryStr = `
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
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `

    const countQueryStr = `
      SELECT COUNT(*) as total FROM design_sources ds ${whereClause}
    `

    const [results, countResult] = await Promise.all([
      sql.query(mainQueryStr, allParams),
      sql.query(countQueryStr, filterParams),
    ])

    const total = parseInt(countResult[0]?.total ?? '0', 10)

    const designs = results.map((row: any) => {
      let metadata: Record<string, any> = {}
      if (row.metadata) {
        if (typeof row.metadata === 'string') {
          try { metadata = JSON.parse(row.metadata) } catch {}
        } else if (typeof row.metadata === 'object') {
          metadata = row.metadata
        }
      }

      let tags: string[] = []
      if (row.tags) {
        if (typeof row.tags === 'string') {
          try { tags = JSON.parse(row.tags) } catch { tags = row.tags.split(',').map((t: string) => t.trim()) }
        } else if (Array.isArray(row.tags)) {
          tags = row.tags
        }
      }

      const colors: string[] = Array.isArray(row.hex_colors) ? row.hex_colors.filter(Boolean) : []
      const typography: string[] = Array.isArray(row.font_families) ? row.font_families.filter(Boolean) : []

      return {
        id: row.id,
        url: row.source_url,
        title: row.source_name,
        industry: row.industry,
        thumbnail_url: row.thumbnail_url || row.screenshot_url,
        screenshot_url: row.screenshot_url,
        colors,
        typography,
        layout: metadata.layout || 'Standard',
        designStyle: metadata.designStyle || 'Modern',
        architecture: metadata.architecture || 'Custom',
        quality: metadata.quality || 5,
        complexity: metadata.complexity,
        useCase: metadata.useCase,
        tags,
        addedDate: new Date(row.created_at).toLocaleDateString(),
      }
    })

    return NextResponse.json({
      designs,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    })
  } catch (error) {
    console.error('[filter-advanced] error:', error)
    return NextResponse.json(
      { error: 'Failed to filter designs', designs: [], pagination: { total: 0, limit: 500, offset: 0, hasMore: false } },
      { status: 200 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Extract filter parameters
    const industries = searchParams.getAll('industry')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'recent'
    const limit = parseInt(searchParams.get('limit') || '500')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build sort clause (safe - whitelisted values only)
    let sortClause = 'ds.created_at DESC'
    if (sortBy === 'oldest') sortClause = 'ds.created_at ASC'
    else if (sortBy === 'name') sortClause = 'ds.source_name ASC'
    else if (sortBy === 'quality') sortClause = 'CAST(ds.metadata->>\'quality\' AS INTEGER) DESC NULLS LAST'

    // Build WHERE clause and collect parameters in order
    const whereConditions: string[] = []
    const filterParams: any[] = []

    // Add industry filters (case-insensitive to handle DB inconsistencies)
    if (industries.length > 0 && !industries.includes('all')) {
      const placeholders = industries.map((_, i) => `$${i + 1}`).join(',')
      whereConditions.push(`LOWER(ds.industry) IN (${placeholders})`)
      filterParams.push(...industries.map(i => i.toLowerCase()))
    }

    // Add search filter
    if (search) {
      const searchPattern = `%${search}%`
      const paramIndex = filterParams.length + 1
      whereConditions.push(`(ds.source_name ILIKE $${paramIndex} OR ds.tags::text ILIKE $${paramIndex} OR ds.metadata::text ILIKE $${paramIndex})`)
      filterParams.push(searchPattern)
    }

    // Build WHERE clause
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    // Add pagination params - they come after filter params
    const limitParamIndex = filterParams.length + 1
    const offsetParamIndex = filterParams.length + 2
    const allParams = [...filterParams, limit, offset]

    // Build and execute main query
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
        dc.primary_color,
        dc.secondary_color,
        dc.all_colors,
        dc.color_harmony,
        dc.mood,
        dt.heading_font,
        dt.body_font,
        dt.mono_font,
        dt.mood as typography_mood,
        dp.layout_structure,
        dp.quality_score,
        dp.pattern_type
      FROM design_sources ds
      LEFT JOIN design_colors dc ON ds.id = dc.source_id
      LEFT JOIN design_typography dt ON ds.id = dt.source_id
      LEFT JOIN design_patterns dp ON ds.id = dp.source_id
      ${whereClause}
      ORDER BY ${sortClause}
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `

    console.log('[v0] Query params:', allParams, 'Query:', mainQueryStr.substring(0, 200))

    const results = await sql.query(mainQueryStr, allParams)

    // Build and execute count query (use only filter params, not pagination)
    const countQueryStr = `
      SELECT COUNT(*) as total
      FROM design_sources ds
      LEFT JOIN design_colors dc ON ds.id = dc.source_id
      LEFT JOIN design_typography dt ON ds.id = dt.source_id
      LEFT JOIN design_patterns dp ON ds.id = dp.source_id
      ${whereClause}
    `
    
    const countResult = await sql.query(countQueryStr, filterParams)
    const total = countResult[0]?.total || 0

    // Transform results
    const designs = results.map((row: any) => {
      let colors: string[] = []
      if (row.all_colors) {
        if (typeof row.all_colors === 'string') {
          try {
            colors = JSON.parse(row.all_colors)
          } catch {
            colors = row.all_colors.split(',').map((c: string) => c.trim())
          }
        } else if (Array.isArray(row.all_colors)) {
          colors = row.all_colors
        }
      }

      let metadata = { layout: 'Standard', architecture: 'Custom', quality: 5, style: 'Modern', useCase: 'General' }
      if (row.metadata) {
        if (typeof row.metadata === 'string') {
          try {
            metadata = { ...metadata, ...JSON.parse(row.metadata) }
          } catch {
            // metadata couldn't be parsed
          }
        } else if (typeof row.metadata === 'object') {
          metadata = { ...metadata, ...row.metadata }
        }
      }

      let tags: string[] = []
      if (row.tags) {
        if (typeof row.tags === 'string') {
          try {
            tags = JSON.parse(row.tags)
          } catch {
            tags = row.tags.split(',').map((t: string) => t.trim())
          }
        } else if (Array.isArray(row.tags)) {
          tags = row.tags
        }
      }

      const generatedUrl = row.thumbnail_url || `https://screenshot.rocks/?url=${encodeURIComponent(row.source_url)}&width=1366&height=768`
      return {
        id: row.id,
        url: row.source_url,
        title: row.source_name,
        industry: row.industry,
        thumbnail_url: generatedUrl,
        colors,
        colorHarmony: row.color_harmony,
        colorMood: row.mood,
        typography: [row.heading_font, row.body_font, row.mono_font].filter(Boolean),
        typographyMood: row.typography_mood,
        layout: metadata.layout || 'Standard',
        layoutType: metadata.layoutType,
        designStyle: metadata.designStyle || 'Modern',
        architecture: metadata.architecture || 'Custom',
        quality: metadata.quality || 5,
        complexity: metadata.complexity,
        useCase: metadata.useCase,
        animationStyle: metadata.animationStyle,
        accessibility: metadata.accessibility,
        tags,
        addedDate: new Date(row.created_at).toLocaleDateString(),
        qualityScore: row.quality_score
      }
    })

    return NextResponse.json({
      designs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('[v0] Advanced filter error:', error)
    return NextResponse.json({ error: 'Failed to filter designs', designs: [], pagination: { total: 0, limit: 100, offset: 0, hasMore: false } }, { status: 200 })
  }
}

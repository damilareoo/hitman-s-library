import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const industry = searchParams.get('industry')
    const search = searchParams.get('search')

    let query: any

    // Build query with proper parameter handling
    if (industry && industry !== 'all' && search) {
      // Both industry and search filters
      query = sql`
        SELECT 
          ds.id,
          ds.source_url,
          ds.source_name,
          ds.industry,
          ds.metadata,
          ds.tags,
          ds.created_at,
          dc.primary_color,
          dc.secondary_color,
          dc.all_colors,
          dt.heading_font,
          dt.body_font,
          dt.mono_font
        FROM design_sources ds
        LEFT JOIN design_colors dc ON ds.id = dc.source_id
        LEFT JOIN design_typography dt ON ds.id = dt.source_id
        WHERE ds.industry = ${industry}
        AND (ds.source_name ILIKE ${`%${search}%`} OR ds.tags::text ILIKE ${`%${search}%`})
        ORDER BY ds.created_at DESC
      `
    } else if (industry && industry !== 'all') {
      // Only industry filter
      query = sql`
        SELECT 
          ds.id,
          ds.source_url,
          ds.source_name,
          ds.industry,
          ds.metadata,
          ds.tags,
          ds.created_at,
          dc.primary_color,
          dc.secondary_color,
          dc.all_colors,
          dt.heading_font,
          dt.body_font,
          dt.mono_font
        FROM design_sources ds
        LEFT JOIN design_colors dc ON ds.id = dc.source_id
        LEFT JOIN design_typography dt ON ds.id = dt.source_id
        WHERE ds.industry = ${industry}
        ORDER BY ds.created_at DESC
      `
    } else if (search) {
      // Only search filter (across title, industry, and tags)
      query = sql`
        SELECT 
          ds.id,
          ds.source_url,
          ds.source_name,
          ds.industry,
          ds.metadata,
          ds.tags,
          ds.created_at,
          dc.primary_color,
          dc.secondary_color,
          dc.all_colors,
          dt.heading_font,
          dt.body_font,
          dt.mono_font
        FROM design_sources ds
        LEFT JOIN design_colors dc ON ds.id = dc.source_id
        LEFT JOIN design_typography dt ON ds.id = dt.source_id
        WHERE ds.source_name ILIKE ${`%${search}%`} 
        OR ds.industry ILIKE ${`%${search}%`}
        OR ds.tags::text ILIKE ${`%${search}%`}
        ORDER BY ds.created_at DESC
      `
    } else {
      // No filters - show all
      query = sql`
        SELECT 
          ds.id,
          ds.source_url,
          ds.source_name,
          ds.industry,
          ds.metadata,
          ds.tags,
          ds.created_at,
          dc.primary_color,
          dc.secondary_color,
          dc.all_colors,
          dt.heading_font,
          dt.body_font,
          dt.mono_font
        FROM design_sources ds
        LEFT JOIN design_colors dc ON ds.id = dc.source_id
        LEFT JOIN design_typography dt ON ds.id = dt.source_id
        ORDER BY ds.created_at DESC
      `
    }

    const results = await query

    const designs = results.map((row: any) => {
      // Parse colors safely - handle both JSON string and array formats
      let colors: string[] = []
      if (row.all_colors) {
        if (typeof row.all_colors === 'string') {
          try {
            // Try parsing as JSON first
            colors = JSON.parse(row.all_colors)
          } catch {
            // If JSON parse fails, treat as comma-separated string
            colors = row.all_colors.split(',').map((c: string) => c.trim())
          }
        } else if (Array.isArray(row.all_colors)) {
          colors = row.all_colors
        }
      }

      // Parse metadata safely
      let metadata = { layout: 'Standard Layout', architecture: 'Custom', quality: 5 }
      if (row.metadata) {
        if (typeof row.metadata === 'string') {
          try {
            metadata = JSON.parse(row.metadata)
          } catch {
            // metadata couldn't be parsed
          }
        } else if (typeof row.metadata === 'object') {
          metadata = row.metadata
        }
      }

      // Parse tags safely
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

      return {
        id: row.id,
        url: row.source_url,
        title: row.source_name,
        industry: row.industry,
        colors,
        typography: [row.heading_font, row.body_font, row.mono_font].filter(Boolean),
        layout: metadata.layout || 'Standard Layout',
        architecture: metadata.architecture || 'Custom',
        quality: metadata.quality || 5,
        tags,
        addedDate: new Date(row.created_at).toLocaleDateString()
      }
    })

    return NextResponse.json(designs)
  } catch (error) {
    console.error('List designs error:', error)
    return NextResponse.json({ error: 'Failed to fetch designs', designs: [] }, { status: 200 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const industry = searchParams.get('industry')
    const search = searchParams.get('search')

    let results: any[]

    if (industry && industry !== 'all' && search) {
      results = await sql`
        SELECT id, source_url, source_name, industry, metadata, tags, created_at, screenshot_url, mobile_screenshot_url, figma_capture_url, thumbnail_url
        FROM design_sources
        WHERE industry = ${industry}
          AND (source_name ILIKE ${`%${search}%`} OR tags::text ILIKE ${`%${search}%`})
        ORDER BY created_at DESC
      `
    } else if (industry && industry !== 'all') {
      results = await sql`
        SELECT id, source_url, source_name, industry, metadata, tags, created_at, screenshot_url, mobile_screenshot_url, figma_capture_url, thumbnail_url
        FROM design_sources
        WHERE industry = ${industry}
        ORDER BY created_at DESC
      `
    } else if (search) {
      results = await sql`
        SELECT id, source_url, source_name, industry, metadata, tags, created_at, screenshot_url, mobile_screenshot_url, figma_capture_url, thumbnail_url
        FROM design_sources
        WHERE source_name ILIKE ${`%${search}%`}
           OR industry ILIKE ${`%${search}%`}
           OR tags::text ILIKE ${`%${search}%`}
        ORDER BY created_at DESC
      `
    } else {
      results = await sql`
        SELECT id, source_url, source_name, industry, metadata, tags, created_at, screenshot_url, mobile_screenshot_url, figma_capture_url, thumbnail_url
        FROM design_sources
        ORDER BY created_at DESC
      `
    }

    const designs = results.map((row: any) => {
      let metadata: any = {}
      if (row.metadata) {
        if (typeof row.metadata === 'string') {
          try { metadata = JSON.parse(row.metadata) } catch { /* ignore */ }
        } else if (typeof row.metadata === 'object') {
          metadata = row.metadata
        }
      }

      return {
        id: row.id,
        url: row.source_url,
        title: row.source_name,
        industry: row.industry,
        created_at: row.created_at,
        screenshot_url: row.screenshot_url ?? null,
        mobile_screenshot_url: row.mobile_screenshot_url ?? null,
        figma_capture_url: row.figma_capture_url ?? null,
        thumbnail_url: row.thumbnail_url ?? null,
        extraction_error: metadata.extraction_error ?? null,
      }
    })

    return NextResponse.json(designs)
  } catch (error) {
    console.error('List designs error:', error)
    return NextResponse.json({ error: 'Failed to fetch designs', designs: [] }, { status: 200 })
  }
}

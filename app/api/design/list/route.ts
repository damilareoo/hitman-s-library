import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { toHttps } from '@/lib/secure-url'

const sql = getSql()

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const industry = searchParams.get('kind')
    const search = searchParams.get('search')

    let results: any[]

    if (industry && industry !== 'all' && search) {
      results = await sql`
        SELECT id, source_url, source_name, kind, metadata, tags, created_at, screenshot_url, mobile_screenshot_url, thumbnail_url
        FROM design_sources
        WHERE kind = ${industry}
          AND (source_name ILIKE ${`%${search}%`} OR tags::text ILIKE ${`%${search}%`})
        ORDER BY created_at DESC
      `
    } else if (industry && industry !== 'all') {
      results = await sql`
        SELECT id, source_url, source_name, kind, metadata, tags, created_at, screenshot_url, mobile_screenshot_url, thumbnail_url
        FROM design_sources
        WHERE kind = ${industry}
        ORDER BY created_at DESC
      `
    } else if (search) {
      results = await sql`
        SELECT id, source_url, source_name, kind, metadata, tags, created_at, screenshot_url, mobile_screenshot_url, thumbnail_url
        FROM design_sources
        WHERE source_name ILIKE ${`%${search}%`}
           OR kind ILIKE ${`%${search}%`}
           OR tags::text ILIKE ${`%${search}%`}
        ORDER BY created_at DESC
      `
    } else {
      results = await sql`
        SELECT id, source_url, source_name, kind, metadata, tags, created_at, screenshot_url, mobile_screenshot_url, thumbnail_url
        FROM design_sources
        ORDER BY created_at DESC
      `
    }

    // Palette and type counts in one round trip. The admin needs to see which
    // sites landed without them, and a per-row subselect in each of the four
    // queries above would be four copies of the same thing.
    const ids = results.map((r: any) => r.id)
    const colorCounts = new Map<string, number>()
    const typeCounts = new Map<string, number>()
    if (ids.length > 0) {
      const [palette, type] = await Promise.all([
        sql`
          SELECT source_id, COUNT(*)::int AS n
          FROM design_colors
          WHERE source_id = ANY(${ids}) AND hex_value IS NOT NULL
          GROUP BY source_id
        `,
        sql`
          SELECT source_id, COUNT(*)::int AS n
          FROM design_typography
          WHERE source_id = ANY(${ids}) AND role != 'legacy'
          GROUP BY source_id
        `,
      ])
      for (const row of palette) colorCounts.set(String(row.source_id), Number(row.n))
      for (const row of type) typeCounts.set(String(row.source_id), Number(row.n))
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
        kind: row.kind || 'Unsorted',
        created_at: row.created_at,
        screenshot_url: toHttps(row.screenshot_url),
        mobile_screenshot_url: toHttps(row.mobile_screenshot_url),
        thumbnail_url: toHttps(row.thumbnail_url),
        extraction_error: metadata.extraction_error ?? null,
        color_count: colorCounts.get(String(row.id)) ?? 0,
        type_count: typeCounts.get(String(row.id)) ?? 0,
      }
    })

    return NextResponse.json(designs)
  } catch (error) {
    console.error('List designs error:', error)
    return NextResponse.json({ error: 'Failed to fetch designs', designs: [] }, { status: 200 })
  }
}

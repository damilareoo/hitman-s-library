// app/api/design/[id]/route.ts
import { neon } from '@neondatabase/serverless'
import { NextResponse } from 'next/server'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    const sources = await sql`
      SELECT id, source_url, screenshot_url, mobile_screenshot_url, figma_capture_url, created_at,
             metadata->>'extraction_error' as extraction_error
      FROM design_sources WHERE id = ${id}
    `
    if (!sources.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const [colors, typography, assets] = await Promise.all([
      sql`SELECT hex_value, oklch FROM design_colors WHERE source_id = ${id} ORDER BY id`,
      sql`
        SELECT font_family, role, google_fonts_url, primary_weight
        FROM design_typography WHERE source_id = ${id} AND role != 'legacy'
        ORDER BY CASE role WHEN 'heading' THEN 1 WHEN 'body' THEN 2 WHEN 'mono' THEN 3 ELSE 4 END
      `,
      sql`
        SELECT id, type, content, width, height
        FROM design_assets WHERE source_id = ${id}
        ORDER BY type, id
      `,
    ])

    const source = sources[0]
    return NextResponse.json({
      id: source.id,
      url: source.source_url,
      screenshot_url: source.screenshot_url ?? null,
      mobile_screenshot_url: source.mobile_screenshot_url ?? null,
      figma_capture_url: source.figma_capture_url ?? null,
      created_at: source.created_at,
      extraction_error: source.extraction_error ?? null,
      colors,
      typography,
      assets,
    })
  } catch (err) {
    console.error('[GET /api/design/[id]]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

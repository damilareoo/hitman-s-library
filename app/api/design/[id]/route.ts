// app/api/design/[id]/route.ts
import { getSql } from '@/lib/db'
import { getHistoriesByIds } from '@/lib/extraction-history'
import { favoriteCounts } from '@/lib/taste'
import { toHttps } from '@/lib/secure-url'
import { NextResponse } from 'next/server'

const sql = getSql()

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
      SELECT id, source_url, screenshot_url, mobile_screenshot_url, created_at,
             metadata->>'extraction_error' as extraction_error,
             COALESCE((metadata->>'live_preview')::boolean, true) as live_preview,
              metadata->>'motion_error' as motion_error,
              current_extraction_id, motion_clip_url
      FROM design_sources WHERE id = ${id}
    `
    if (!sources.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const [colors, typographyRows] = await Promise.all([
      sql`SELECT hex_value, oklch, area_share FROM design_colors WHERE source_id = ${id} ORDER BY id`,
      sql`
        SELECT font_family, role, google_fonts_url, primary_weight, sample_size_px, sample_line_height
        FROM design_typography WHERE source_id = ${id} AND role != 'legacy'
        ORDER BY CASE role WHEN 'heading' THEN 1 WHEN 'body' THEN 2 WHEN 'mono' THEN 3 ELSE 4 END
      `,
    ])

    const source = sources[0]
    const favCounts = await favoriteCounts([id])

    // Resolve through the current-extraction pointer (Phase 0). The snapshot
    // is written identically to the legacy tables, so this changes nothing
    // visible — it only makes the pointer the source of truth.
    const pointer = source.current_extraction_id
    let snapshotColors = colors
    const typography = typographyRows.map((t: any) => ({
      font_family: t.font_family,
      role: t.role,
      google_fonts_url: t.google_fonts_url,
      primary_weight: t.primary_weight,
      sample_size_px: t.sample_size_px ?? null,
      sample_line_height: t.sample_line_height ?? null,
    }))
    let snapshotTypography = typography
    let screenshotUrl = source.screenshot_url
    let mobileScreenshotUrl = source.mobile_screenshot_url
    if (typeof pointer === 'number') {
      const histories = await getHistoriesByIds([pointer])
      const snapshot = histories.get(pointer)
      if (snapshot) {
        snapshotColors = snapshot.palette.map(p => ({
          hex_value: p.hex,
          oklch: p.oklch,
          area_share: typeof p.area_share === 'number' ? p.area_share : null,
        }))
        snapshotTypography = snapshot.typography.map(t => ({
          font_family: t.fontFamily,
          role: t.role,
          google_fonts_url: t.googleFontsUrl,
          primary_weight: t.primaryWeight,
          sample_size_px: t.sampleSizePx ?? null,
          sample_line_height: t.sampleLineHeight ?? null,
        }))
        screenshotUrl = snapshot.screenshot_url ?? screenshotUrl
        mobileScreenshotUrl = snapshot.mobile_screenshot_url ?? mobileScreenshotUrl
      }
    }

    return NextResponse.json({
      id: source.id,
      url: source.source_url,
      screenshot_url: toHttps(screenshotUrl),
      mobile_screenshot_url: toHttps(mobileScreenshotUrl),
      live_preview: source.live_preview,
      created_at: source.created_at,
      extraction_error: source.extraction_error ?? null,
      motion_clip_url: typeof source.motion_clip_url === 'string' ? source.motion_clip_url : null,
      motion_error: source.motion_error ?? null,
      favorite_count: favCounts.get(id) ?? 0,
      colors: snapshotColors,
      typography: snapshotTypography,
    })
  } catch (err) {
    console.error('[GET /api/design/[id]]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

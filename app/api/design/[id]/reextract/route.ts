// app/api/design/[id]/reextract/route.ts
// Re-runs full design extraction for an existing source, bypassing the duplicate guard.
import { NextResponse } from 'next/server'
import { Client } from '@neondatabase/serverless'
import { getSql } from '@/lib/db'
import { extractFullDesignData } from '@/lib/browser-extraction'
import { toColorFormats, deduplicateColors } from '@/lib/color-utils'
import { recordExtraction } from '@/lib/extraction-history'
import { SIMILAR_ENABLED, embedSite, toVectorLiteral } from '@/lib/similarity'
import { requireAdmin } from '@/lib/admin-auth'

const sql = getSql()

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  // Fetch existing record
  const sources = await sql`
    SELECT id, source_url FROM design_sources WHERE id = ${id}
  `
  if (!sources.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const { source_url: url } = sources[0]

  try {
    const extractionResult = await extractFullDesignData(url)

    // Nothing rendered: the site is down, parked, or challenging us. Clearing
    // the error and writing empty results over a site that was fine yesterday
    // is the worse outcome, so this returns the reason and touches nothing.
    if (extractionResult.renderedNothing) {
      const reason = 'The page rendered nothing readable — the site may be down or serving a challenge'
      await sql`
        UPDATE design_sources
        SET metadata = COALESCE(metadata, '{}') || jsonb_build_object('extraction_error', ${reason}::text)
        WHERE id = ${id}
      `.catch(() => null)
      return NextResponse.json({ error: reason, unchanged: true }, { status: 422 })
    }

    const colorFormats = deduplicateColors(extractionResult.colors)
      .map(c => toColorFormats(c))
      .filter((c): c is { hex: string; oklch: string } => c !== null)
      .slice(0, 16)

    // Clear any previous extraction error now that we succeeded
    await sql`
      UPDATE design_sources
      SET metadata = COALESCE(metadata, '{}') - 'extraction_error'
      WHERE id = ${id}
    `.catch(() => null)

    // Update screenshot URL
    if (extractionResult.screenshotUrl) {
      await sql`UPDATE design_sources SET screenshot_url = ${extractionResult.screenshotUrl}, mobile_screenshot_url = ${extractionResult.mobileScreenshotUrl} WHERE id = ${id}`
    }

    // Hover clip (Phase 3): same write shape as the initial insert. A fresh
    // take replaces the old clip; the old blob is deleted best-effort so
    // storage does not accumulate a clip per re-extract.
    {
      const [prev] = await sql`SELECT motion_clip_url FROM design_sources WHERE id = ${id}`
      if (extractionResult.motionClipUrl) {
        await sql`UPDATE design_sources SET motion_clip_url = ${extractionResult.motionClipUrl}, motion_bytes = ${extractionResult.motionBytes} WHERE id = ${id}`.catch(() => null)
        if (prev?.motion_clip_url && prev.motion_clip_url !== extractionResult.motionClipUrl) {
          try {
            const { del } = await import('@vercel/blob')
            await del(prev.motion_clip_url)
          } catch { /* orphaned blob — storage, not data loss */ }
        }
      }
      const motionMeta: Record<string, unknown> = {}
      if (extractionResult.motionError) {
        motionMeta.motion_error = extractionResult.motionError
      } else {
        // A fresh take clears a stale motion error, like extraction_error.
        await sql`UPDATE design_sources SET metadata = COALESCE(metadata, '{}') - 'motion_error' WHERE id = ${id}`.catch(() => null)
      }
      const mt = extractionResult.motionTags
      if (mt && (mt.hasTransitions || mt.hasAnimations)) {
        motionMeta.motion = mt
        const motionTagList = [
          ...(mt.hasTransitions ? ['motion:transitions'] : []),
          ...(mt.hasAnimations ? ['motion:animations'] : []),
          ...mt.easings.slice(0, 4).map(e => `motion:${e}`),
        ]
        if (motionTagList.length > 0) {
          await sql`UPDATE design_sources SET tags = ARRAY(SELECT DISTINCT unnest(COALESCE(tags, '{}') || ${motionTagList}::text[])) WHERE id = ${id}`.catch(() => null)
        }
      }
      await sql`UPDATE design_sources SET metadata = COALESCE(metadata, '{}') || ${JSON.stringify(motionMeta)}::jsonb WHERE id = ${id}`.catch(() => null)
    }

    // Write changelog entry for reextraction
    {
      const [source] = await sql`SELECT source_url, source_name FROM design_sources WHERE id = ${id}`
      if (source) {
        await sql`
          INSERT INTO design_changelog (source_id, source_url, source_name, event_type)
          VALUES (${id}, ${source.source_url}, ${source.source_name}, 'reextracted')
        `.catch(() => null)
      }
    }

    // Replace colors
    if (colorFormats.length > 0) {
      await sql`DELETE FROM design_colors WHERE source_id = ${id}`
      for (const color of colorFormats) {
        await sql`
          INSERT INTO design_colors (source_id, hex_value, oklch)
          VALUES (${id}, ${color.hex}, ${color.oklch})
          ON CONFLICT DO NOTHING
        `.catch(() => null)
      }
    }

    // Replace assets transactionally
    const validAssets = (extractionResult.assets ?? []).filter(a => a != null && a.type)
    if (validAssets.length > 0) {
      const assetClient = new Client(process.env.DATABASE_URL!)
      await assetClient.connect()
      try {
        await assetClient.query('BEGIN')
        await assetClient.query('DELETE FROM design_assets WHERE source_id = $1', [id])
        for (const asset of validAssets) {
          await assetClient.query(
            'INSERT INTO design_assets (source_id, type, content, width, height) VALUES ($1, $2, $3, $4, $5)',
            [id, asset.type, asset.content, asset.width, asset.height]
          )
        }
        await assetClient.query('COMMIT')
      } catch (err) {
        await assetClient.query('ROLLBACK')
        console.error('[reextract] Assets transaction rolled back:', err)
      } finally {
        await assetClient.end()
      }
    }

    // Replace typography roles transactionally
    if (extractionResult.typography && extractionResult.typography.length > 0) {
      const typClient = new Client(process.env.DATABASE_URL!)
      await typClient.connect()
      try {
        await typClient.query('BEGIN')
        await typClient.query(
          // `role != 'legacy'` is NULL for the legacy rows, whose role is NULL,
          // so it never matched them and they outlived every re-extraction.
          // Nothing reads them — clear the source outright and rewrite.
          'DELETE FROM design_typography WHERE source_id = $1',
          [id]
        )
        for (const t of extractionResult.typography) {
          await typClient.query(
            `INSERT INTO design_typography (source_id, font_family, role, google_fonts_url, primary_weight, sample_size_px, sample_line_height)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (source_id, role) DO UPDATE SET
               font_family = EXCLUDED.font_family,
               google_fonts_url = EXCLUDED.google_fonts_url,
               primary_weight = EXCLUDED.primary_weight,
               sample_size_px = EXCLUDED.sample_size_px,
               sample_line_height = EXCLUDED.sample_line_height`,
            [id, t.fontFamily, t.role, t.googleFontsUrl, t.primaryWeight, t.sampleSizePx, t.sampleLineHeight]
          )
        }
        await typClient.query('COMMIT')
      } catch (err) {
        await typClient.query('ROLLBACK')
        console.error('[reextract] Typography transaction rolled back:', err)
      } finally {
        await typClient.end()
      }
    }

    // Append-only snapshot (Phase 0): every run appends a versioned row and
    // repoints the site at it. The legacy tables above are still the public
    // read path, so re-extracting twice leaves two history rows and one
    // unchanged public view.
    await recordExtraction({
      siteId: id,
      screenshotUrl: extractionResult.screenshotUrl ?? null,
      mobileScreenshotUrl: extractionResult.mobileScreenshotUrl ?? null,
      palette: colorFormats,
      typography: (extractionResult.typography ?? []).map(t => ({
        fontFamily: t.fontFamily,
        role: t.role,
        googleFontsUrl: t.googleFontsUrl,
        primaryWeight: t.primaryWeight,
        sampleSizePx: t.sampleSizePx,
        sampleLineHeight: t.sampleLineHeight,
      })),
      assets: validAssets,
    })

    // Similarity embedding (Phase 2): re-embed on every re-extract, same
    // best-effort rule as the initial insert. Never fails the extraction.
    if (SIMILAR_ENABLED) {
      try {
        const [siteRow] = await sql`SELECT kind FROM design_sources WHERE id = ${id}`
        const embedding = await embedSite({
          palette: colorFormats.map(c => ({ hex: c.hex, oklch: c.oklch })),
          fonts: (extractionResult.typography ?? []).map(t => ({
            fontFamily: t.fontFamily,
            role: t.role,
          })),
          kind: siteRow?.kind ?? null,
          screenshotUrl: extractionResult.screenshotUrl ?? null,
          siteId: id,
        })
        await sql`UPDATE design_sources SET embedding = ${toVectorLiteral(embedding)}::vector WHERE id = ${id}`.catch(() => null)
      } catch (err) {
        console.error('[reextract] embedding failed:', err)
      }
    }

    return NextResponse.json({
      success: true,
      id,
      url,
      screenshot_url: extractionResult.screenshotUrl ?? null,
      colors: colorFormats.length,
      typography: extractionResult.typography?.length ?? 0,
      assets: extractionResult.assets?.length ?? 0,
    })
  } catch (err: any) {
    console.error(`[reextract] Failed for id=${id} url=${url}:`, err)
    // Store the error reason so the UI can explain why data is unavailable
    await sql`
      UPDATE design_sources
      -- ::text matters. jsonb_build_object takes "any", so without a cast
      -- Postgres cannot infer the parameter's type and raises "could not
      -- determine data type of parameter $1". The .catch below then swallowed
      -- it, which is why no extraction error has ever actually been recorded.
      SET metadata = COALESCE(metadata, '{}') || jsonb_build_object('extraction_error', ${err.message ?? 'Unknown error'}::text)
      WHERE id = ${id}
    `.catch(() => null)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

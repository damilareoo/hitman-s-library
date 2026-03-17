// app/api/design/[id]/reextract/route.ts
// Re-runs full design extraction for an existing source, bypassing the duplicate guard.
export const maxDuration = 60
import { NextResponse } from 'next/server'
import { neon, Client } from '@neondatabase/serverless'
import { extractFullDesignData } from '@/lib/browser-extraction'
import { toColorFormats, deduplicateColors } from '@/lib/color-utils'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      await sql`UPDATE design_sources SET screenshot_url = ${extractionResult.screenshotUrl} WHERE id = ${id}`
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
          "DELETE FROM design_typography WHERE source_id = $1 AND role != 'legacy'",
          [id]
        )
        for (const t of extractionResult.typography) {
          await typClient.query(
            `INSERT INTO design_typography (source_id, font_family, role, google_fonts_url, primary_weight)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (source_id, role) DO UPDATE SET
               font_family = EXCLUDED.font_family,
               google_fonts_url = EXCLUDED.google_fonts_url,
               primary_weight = EXCLUDED.primary_weight`,
            [id, t.fontFamily, t.role, t.googleFontsUrl, t.primaryWeight]
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
      SET metadata = COALESCE(metadata, '{}') || jsonb_build_object('extraction_error', ${err.message ?? 'Unknown error'})
      WHERE id = ${id}
    `.catch(() => null)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

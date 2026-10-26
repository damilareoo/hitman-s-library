// app/api/cron/backfill/route.ts
// Vercel cron — runs daily at 3am UTC. Repairs as many sites as fit in the
// 60s window: missing captures, and sites that landed with no palette or no
// typography. A site is only complete when it has both.
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getSql } from '@/lib/db'
import { extractFullDesignData } from '@/lib/browser-extraction'
import { deduplicateColors, toColorFormats } from '@/lib/color-utils'
import { recordExtraction } from '@/lib/extraction-history'

export const maxDuration = 60

const sql = getSql()
const BUDGET_MS = 45_000 // stop queuing new sites after 45s, leave cleanup time

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pending = await sql`
    SELECT id, source_url
    FROM design_sources
    -- The original condition only looked at the two capture columns. A site
    -- whose browser extraction failed at add time landed with an og:image and
    -- no rows in either table, and no job ever went back for it.
    WHERE screenshot_url IS NULL
       OR mobile_screenshot_url IS NULL
       OR NOT EXISTS (
            SELECT 1 FROM design_colors c
            WHERE c.source_id = design_sources.id AND c.hex_value IS NOT NULL
          )
       OR NOT EXISTS (
            SELECT 1 FROM design_typography t
            WHERE t.source_id = design_sources.id AND t.role != 'legacy'
          )
    -- Newest first: those are the ones the library is showing right now.
    ORDER BY created_at DESC
    LIMIT 20
  `

  if (!pending.length) {
    return NextResponse.json({ done: true, message: 'All sites are up to date' })
  }

  const results: Array<{ id: number; ok: boolean; error?: string; colors?: number; typography?: number }> = []
  const start = Date.now()

  for (const { id, source_url } of pending) {
    if (Date.now() - start > BUDGET_MS) break

    try {
      const extraction = await extractFullDesignData(source_url)

      // Nothing rendered: the site is down or challenging us. Leave what is
      // already on the row alone rather than overwriting it with nothing.
      if (extraction.renderedNothing) {
        results.push({ id, ok: false, error: 'rendered nothing' })
        continue
      }

      const palette = deduplicateColors(extraction.colors)
        .map(c => toColorFormats(c))
        .filter((c): c is { hex: string; oklch: string } => c !== null)
        .slice(0, 16)

      if (extraction.screenshotUrl) {
        await sql`
          UPDATE design_sources
          SET
            screenshot_url        = ${extraction.screenshotUrl},
            mobile_screenshot_url = COALESCE(${extraction.mobileScreenshotUrl}, mobile_screenshot_url)
          WHERE id = ${id}
        `
      } else if (extraction.mobileScreenshotUrl) {
        await sql`
          UPDATE design_sources
          SET mobile_screenshot_url = ${extraction.mobileScreenshotUrl}
          WHERE id = ${id}
        `
      }

      if (palette.length > 0) {
        await sql`DELETE FROM design_colors WHERE source_id = ${id}`
        for (const color of palette) {
          await sql`
            INSERT INTO design_colors (source_id, hex_value, oklch)
            VALUES (${id}, ${color.hex}, ${color.oklch})
            ON CONFLICT DO NOTHING
          `.catch(() => null)
        }
      }

      if (extraction.typography.length > 0) {
        await sql`DELETE FROM design_typography WHERE source_id = ${id}`
        for (const t of extraction.typography) {
          await sql`
            INSERT INTO design_typography (
              source_id, font_family, role, google_fonts_url,
              primary_weight, sample_size_px, sample_line_height
            )
            VALUES (
              ${id}, ${t.fontFamily}, ${t.role}, ${t.googleFontsUrl},
              ${t.primaryWeight}, ${t.sampleSizePx}, ${t.sampleLineHeight}
            )
            ON CONFLICT (source_id, role) DO UPDATE SET
              font_family = EXCLUDED.font_family,
              google_fonts_url = EXCLUDED.google_fonts_url,
              primary_weight = EXCLUDED.primary_weight,
              sample_size_px = EXCLUDED.sample_size_px,
              sample_line_height = EXCLUDED.sample_line_height
          `.catch(() => null)
        }
      }

      // Keep the append-only record in step with the tables the API reads.
      await recordExtraction({
        siteId: id,
        screenshotUrl: extraction.screenshotUrl ?? null,
        mobileScreenshotUrl: extraction.mobileScreenshotUrl ?? null,
        palette,
        typography: extraction.typography.map(t => ({
          fontFamily: t.fontFamily,
          role: t.role,
          googleFontsUrl: t.googleFontsUrl,
          primaryWeight: t.primaryWeight,
          sampleSizePx: t.sampleSizePx,
          sampleLineHeight: t.sampleLineHeight,
        })),
        assets: extraction.assets ?? [],
      })

      results.push({ id, ok: true, colors: palette.length, typography: extraction.typography.length })
    } catch (err) {
      console.error(`[cron/backfill] id=${id} failed:`, err)
      results.push({ id, ok: false, error: String(err) })
    }
  }

  if (results.some(r => r.ok)) revalidateTag('designs', 'max')

  return NextResponse.json({ processed: results.length, remaining: pending.length - results.length, results })
}

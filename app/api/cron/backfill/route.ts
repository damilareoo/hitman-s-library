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
const BUDGET_MS = 40_000 // stop starting new sites after 40s, leave cleanup time
// Three at once keeps the 60s function busy: one site takes long enough that a
// serial loop finished exactly one per run, which is a month of mornings for
// the sites that landed hollow before extraction was hardened.
const CONCURRENCY = 3
const PER_RUN = 12

interface RepairResult {
  id: number
  ok: boolean
  error?: string
  colors?: number
  typography?: number
}

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
    LIMIT ${PER_RUN}
  `

  if (!pending.length) {
    return NextResponse.json({ done: true, message: 'All sites are up to date' })
  }

  const results: RepairResult[] = []
  const start = Date.now()
  const queue = [...pending]

  async function repairOne(id: number, source_url: string): Promise<RepairResult> {
    try {
      // No motion take: it is the last ~8 seconds of the run and no backfill
      // writes it. A repair fills palette, type and captures; a clip comes
      // back the next time the site is re-extracted by hand.
      const extraction = await extractFullDesignData(source_url, { motion: false })

      // Nothing rendered: the site is down or challenging us. Leave what is
      // already on the row alone rather than overwriting it with nothing.
      if (extraction.renderedNothing) {
        return { id, ok: false, error: 'rendered nothing' }
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

      return { id, ok: true, colors: palette.length, typography: extraction.typography.length }
    } catch (err) {
      console.error(`[cron/backfill] id=${id} failed:`, err)
      return { id, ok: false, error: String(err) }
    }
  }

  // Workers drain the shared queue, so a slow site does not hold the others
  // behind it and nothing starts that the function cannot finish.
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length > 0) {
        if (Date.now() - start > BUDGET_MS) return
        const job = queue.shift()
        if (!job) return
        results.push(await repairOne(job.id, job.source_url))
      }
    }),
  )

  if (results.some(r => r.ok)) revalidateTag('designs', 'max')

  return NextResponse.json({ processed: results.length, remaining: pending.length - results.length, results })
}

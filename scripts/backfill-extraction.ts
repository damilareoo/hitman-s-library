/**
 * Re-run extraction over the sources the pipeline previously failed on.
 *
 *   bun run scripts/backfill-extraction.ts --dry-run   # list what would run
 *   bun run scripts/backfill-extraction.ts             # run it
 *   bun run scripts/backfill-extraction.ts --limit 10  # run the first 10
 *   bun run scripts/backfill-extraction.ts --all       # every source, not just broken ones
 *
 * "Degraded" means the site cannot be seen, read for colour, or read for type
 * — a stricter test than whether rows exist, because the legacy rows the old
 * fallback wrote are invisible to the UI. Assets are excluded from the test on
 * purpose; see DEGRADED_PREDICATE. Anything that still cannot be extracted gets
 * an honest `extraction_error` rather than being left looking merely empty.
 */
import { readFileSync } from 'fs'
import { neon, Client } from '@neondatabase/serverless'
import { extractFullDesignData } from '../lib/browser-extraction'
import { toColorFormats, deduplicateColors } from '../lib/color-utils'

const env = readFileSync('.env.local', 'utf8')
const DATABASE_URL =
  process.env.DATABASE_URL ??
  env.match(/^DATABASE_URL=(.*)$/m)?.[1].trim().replace(/^["']|["']$/g, '')

if (!DATABASE_URL) throw new Error('DATABASE_URL not found in env or .env.local')
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  const token = env.match(/^BLOB_READ_WRITE_TOKEN=(.*)$/m)?.[1].trim().replace(/^["']|["']$/g, '')
  if (token) process.env.BLOB_READ_WRITE_TOKEN = token
}

const sql = neon(DATABASE_URL)

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const all = args.includes('--all')
const limitArg = args.indexOf('--limit')
const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : Infinity

/**
 * Sources the gallery cannot show properly.
 *
 * The screenshot clause matters as much as the panels: queryDesigns filters on
 * `screenshot_url IS NOT NULL`, so a source without one is not merely missing a
 * picture — it is absent from the gallery altogether. Three sites with complete
 * colour, type and asset data were invisible for exactly this reason, and went
 * unnoticed because they passed every panel check.
 *
 * Assets are deliberately not part of this test. A canvas game or a WebGL site
 * has nothing in the document to extract, and no number of re-attempts changes
 * that — a page drawn into a single <canvas> would have been queued nightly
 * forever on the strength of a panel it can never fill. A site is degraded when
 * it cannot be seen, cannot be read for colour, or cannot be read for type;
 * assets are what a site happens to have, and their absence is recorded as a
 * note rather than treated as a failure.
 */
const DEGRADED_PREDICATE = `
  s.screenshot_url IS NULL OR s.screenshot_url = ''
  or (select count(*) from design_colors c where c.source_id = s.id and c.hex_value is not null) = 0
  or (select count(*) from design_typography t where t.source_id = s.id and t.role is not null and t.role <> 'legacy') = 0
`

async function replaceColors(id: number, colors: string[]): Promise<number> {
  const palette = deduplicateColors(colors)
    .map(c => toColorFormats(c))
    .filter((c): c is { hex: string; oklch: string } => c !== null)
    .slice(0, 16)

  if (palette.length === 0) return 0

  await sql`DELETE FROM design_colors WHERE source_id = ${id}`
  for (const color of palette) {
    await sql`
      INSERT INTO design_colors (source_id, hex_value, oklch)
      VALUES (${id}, ${color.hex}, ${color.oklch})
      ON CONFLICT DO NOTHING
    `
  }
  return palette.length
}

async function replaceRows(
  id: number,
  table: 'design_assets' | 'design_typography',
  rows: any[],
): Promise<number> {
  if (rows.length === 0) return 0

  const client = new Client(DATABASE_URL!)
  await client.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM ${table} WHERE source_id = $1`, [id])

    for (const row of rows) {
      if (table === 'design_assets') {
        await client.query(
          'INSERT INTO design_assets (source_id, type, content, width, height) VALUES ($1, $2, $3, $4, $5)',
          [id, row.type, row.content, row.width, row.height],
        )
      } else {
        await client.query(
          `INSERT INTO design_typography (source_id, font_family, role, google_fonts_url, primary_weight)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (source_id, role) DO UPDATE SET
             font_family = EXCLUDED.font_family,
             google_fonts_url = EXCLUDED.google_fonts_url,
             primary_weight = EXCLUDED.primary_weight`,
          [id, row.fontFamily, row.role, row.googleFontsUrl, row.primaryWeight],
        )
      }
    }

    await client.query('COMMIT')
    return rows.length
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(`  ${table} transaction rolled back:`, err)
    return 0
  } finally {
    await client.end()
  }
}

async function main() {
  const targets = await sql.query(
    `select s.id, s.source_url
     from design_sources s
     ${all ? '' : `where ${DEGRADED_PREDICATE}`}
     order by s.created_at desc`,
  )

  const queue = targets.slice(0, limit)
  console.log(`${targets.length} source(s) need backfill; processing ${queue.length}\n`)

  if (dryRun) {
    queue.forEach((t: any, i: number) => console.log(`${String(i + 1).padStart(3)}. ${t.source_url}`))
    return
  }

  let recovered = 0
  let stillBroken = 0

  for (const [index, target] of queue.entries()) {
    const { id, source_url: url } = target as { id: number; source_url: string }
    const label = `[${index + 1}/${queue.length}] ${url}`

    try {
      const result = await extractFullDesignData(url)

      // A page that rendered nothing is a page we cannot judge. Recording the
      // reason and moving on leaves whatever the site last gave us intact.
      if (result.renderedNothing) {
        const reason = 'The page rendered nothing readable — the site may be down or serving a challenge'
        await sql`
          UPDATE design_sources
          SET metadata = COALESCE(metadata, '{}') || jsonb_build_object('extraction_error', ${reason}::text)
          WHERE id = ${id}
        `.catch(() => null)
        stillBroken++
        console.log(`${label}\n  EMPTY nothing rendered — existing data left as it was`)
        continue
      }

      const colorCount = await replaceColors(id, result.colors)
      const typeCount = await replaceRows(id, 'design_typography', result.typography)
      const assetCount = await replaceRows(id, 'design_assets', result.assets)

      if (result.screenshotUrl) {
        await sql`
          UPDATE design_sources
          SET screenshot_url = ${result.screenshotUrl},
              mobile_screenshot_url = ${result.mobileScreenshotUrl},
              analyzed_at = NOW()
          WHERE id = ${id}
        `
      }

      const hasShot = Boolean(result.screenshotUrl)
      // Matches DEGRADED_PREDICATE: assets do not decide whether a source is
      // whole, or the next run picks straight back up the sites this one just
      // finished with.
      const complete = hasShot && colorCount > 0 && typeCount > 0

      if (complete) {
        // Still say so when a page yielded no assets. The site is complete as
        // far as the queue is concerned, but the assets tab is going to be
        // empty and the empty state is the one place that can explain why.
        if (assetCount === 0) {
          await sql`
            UPDATE design_sources
            SET metadata = COALESCE(metadata, '{}') || jsonb_build_object('extraction_error', 'No assets could be extracted from this page'::text)
            WHERE id = ${id}
          `
        } else {
          await sql`
            UPDATE design_sources
            SET metadata = COALESCE(metadata, '{}') - 'extraction_error'
            WHERE id = ${id}
          `
        }
        recovered++
        console.log(
          `${label}\n  OK    colors=${colorCount} type=${typeCount} assets=${assetCount}${assetCount === 0 ? ' (no assets in the document)' : ''}`,
        )
      } else {
        // Say which part is missing. A row that is merely empty looks the same
        // whether nothing was found or nothing was attempted.
        const missing = [
          !hasShot && 'screenshot',
          colorCount === 0 && 'colors',
          typeCount === 0 && 'typography',
        ].filter(Boolean).join(', ')

        await sql`
          UPDATE design_sources
          SET metadata = COALESCE(metadata, '{}') || jsonb_build_object('extraction_error', ${`No ${missing} could be extracted from this page`}::text)
          WHERE id = ${id}
        `
        stillBroken++
        console.log(`${label}\n  THIN  colors=${colorCount} type=${typeCount} assets=${assetCount} — missing ${missing}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await sql`
        UPDATE design_sources
        SET metadata = COALESCE(metadata, '{}') || jsonb_build_object('extraction_error', ${message}::text)
        WHERE id = ${id}
      `.catch(() => null)
      stillBroken++
      console.log(`${label}\n  FAIL  ${message}`)
    }
  }

  console.log(`\nRecovered ${recovered}, still incomplete ${stillBroken}, of ${queue.length} attempted.`)
  process.exit(0)
}

main()

/**
 * Re-photograph the sources whose stored capture is a picture of nothing much.
 *
 *   bun run scripts/recapture-flat.ts --dry-run    # list what would be redone
 *   bun run scripts/recapture-flat.ts             # redo them
 *   bun run scripts/recapture-flat.ts --limit 5
 *   bun run scripts/recapture-flat.ts --threshold 6000
 *   bun run scripts/recapture-flat.ts --ids 4,73,188   # specific sources
 *
 * `--ids` exists because bytes per megapixel does not catch every one of these.
 * A splash screen with a logo on it, or a hero caught mid-transition, is uniform
 * where it matters — across the first screenful — while carrying enough detail
 * elsewhere to clear the threshold. Those are found by eye, or by measuring how
 * uniform the top of the capture is, and named directly.
 *
 * Sites with intro animations were photographed mid-preloader — joyco.studio was
 * a flat blue panel, therawmaterials.com a cream rectangle — while their colour,
 * type and asset data extracted perfectly. Nothing reading the document could
 * have noticed, because the document was fine; only the pixels were wrong.
 *
 * "Nothing much" is bytes of WebP per megapixel: a flat frame costs almost
 * nothing to store and a painted page costs a great deal. A new capture replaces
 * the old one only when it is materially busier, so a site that really is this
 * sparse keeps the picture it has.
 */
import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'
import sharp from 'sharp'
import {
  getBrowser,
  gotoResilient,
  settlePage,
  captureFullPageScreenshot,
  captureMobileScreenshot,
} from '../lib/browser-extraction'

const env = readFileSync('.env.local', 'utf8')
const pick = (key: string) =>
  process.env[key] ?? env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '')

const DATABASE_URL = pick('DATABASE_URL')
if (!DATABASE_URL) throw new Error('DATABASE_URL not found in env or .env.local')
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  const token = pick('BLOB_READ_WRITE_TOKEN')
  if (token) process.env.BLOB_READ_WRITE_TOKEN = token
}

const sql = neon(DATABASE_URL)

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const numeric = (flag: string, fallback: number) => {
  const i = args.indexOf(flag)
  return i !== -1 ? parseFloat(args[i + 1]) : fallback
}
const limit = numeric('--limit', Infinity)
const idsArg = args.indexOf('--ids')
const explicitIds = idsArg !== -1
  ? args[idsArg + 1].split(',').map(n => parseInt(n.trim(), 10)).filter(Number.isFinite)
  : null
const THRESHOLD = numeric('--threshold', 5000)
/** A replacement has to be this much busier to be worth swapping in. */
const IMPROVEMENT = 1.25
/** Or this much less of its first screen given over to one flat colour. */
const UNIFORMITY_GAIN = 0.05

interface Frame {
  /** Bytes of WebP per megapixel — how much is in the picture overall. */
  density: number
  /** Share of the first screenful held by a single colour, 0–1. */
  uniformity: number
}

async function measure(url: string): Promise<Frame | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const { width, height } = await sharp(buf).metadata()
    if (!width || !height) return null

    // The first screenful only. A splash screen is uniform exactly where it
    // matters and a long page should not be judged on its own whitespace.
    const cropHeight = Math.min(height, Math.round(width * 0.625))
    const { data, info } = await sharp(buf)
      .extract({ left: 0, top: 0, width, height: cropHeight })
      .resize(64, 64, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true })

    const counts = new Map<string, number>()
    for (let i = 0; i < data.length; i += info.channels) {
      // Quantised to 32 levels a channel so a gradient does not read as detail.
      const key = `${data[i] >> 3},${data[i + 1] >> 3},${data[i + 2] >> 3}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return {
      density: buf.length / ((width * height) / 1e6),
      uniformity: Math.max(...counts.values()) / (info.width * info.height),
    }
  } catch {
    return null
  }
}

/**
 * Is the new capture showing more of the site than the old one?
 *
 * Either measure can carry it. Density catches the blank and the preloader; a
 * fall in uniformity catches the frame that was busy further down the page but
 * held a splash screen across the top, which density alone scores as fine.
 */
function better(before: Frame, after: Frame): boolean {
  return after.density > before.density * IMPROVEMENT ||
    before.uniformity - after.uniformity > UNIFORMITY_GAIN
}

async function main() {
  const sources = explicitIds
    ? await sql`
        SELECT id, source_url, screenshot_url
        FROM design_sources
        WHERE id = ANY(${explicitIds}) AND screenshot_url IS NOT NULL AND screenshot_url <> ''
        ORDER BY id
      `
    : await sql`
        SELECT id, source_url, screenshot_url
        FROM design_sources
        WHERE screenshot_url IS NOT NULL AND screenshot_url <> ''
        ORDER BY id
      `
  console.log(`Measuring ${sources.length} captures...`)

  const candidates: Array<{ id: number; url: string; before: Frame }> = []
  const queue = [...sources]
  await Promise.all(
    Array.from({ length: 12 }, async () => {
      while (queue.length) {
        const s = queue.shift() as any
        const frame = await measure(s.screenshot_url)
        // Named sources are taken on trust: they were picked because the frame
        // is wrong in a way the density threshold does not see. The improvement
        // gate below is what keeps a good capture from being replaced.
        if (frame && (explicitIds || frame.density < THRESHOLD)) {
          candidates.push({ id: s.id, url: s.source_url, before: frame })
        }
      }
    }),
  )
  candidates.sort((a, b) => a.before.density - b.before.density)

  const work = candidates.slice(0, limit)
  console.log(
    explicitIds
      ? `\n${work.length} named source(s)\n`
      : `\n${candidates.length} under ${THRESHOLD} bytes/MP; processing ${work.length}\n`,
  )

  if (dryRun) {
    work.forEach((c, i) =>
      console.log(
        `${String(i + 1).padStart(3)}. ${String(Math.round(c.before.density)).padStart(6)} bytes/MP  ` +
        `${c.before.uniformity.toFixed(2)} flat  ${c.url}`,
      ),
    )
    return
  }

  const browser = await getBrowser()
  if (!browser) throw new Error('Browser unavailable')

  let replaced = 0
  let kept = 0

  for (const [index, c] of work.entries()) {
    const label = `[${index + 1}/${work.length}] ${c.url}`
    const page = await browser.newPage()
    try {
      await page.setBypassCSP(true)
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
      await gotoResilient(page, c.url)
      await settlePage(page)

      const shot = await captureFullPageScreenshot(page, c.url, { scroll: false })
      if (!shot) {
        console.log(`${label}\n  none   capture returned nothing — left alone`)
        kept++
        continue
      }

      const after = await measure(shot)
      if (!after || !better(c.before, after)) {
        const seen = after ? `${Math.round(after.density)}/${after.uniformity.toFixed(2)}` : '?'
        console.log(
          `${label}\n  same   ${Math.round(c.before.density)}/${c.before.uniformity.toFixed(2)} -> ${seen} — kept the original`,
        )
        kept++
        continue
      }

      const mobile = await captureMobileScreenshot(page, c.url)
      await sql`
        UPDATE design_sources
        SET screenshot_url = ${shot},
            mobile_screenshot_url = COALESCE(${mobile}, mobile_screenshot_url),
            analyzed_at = NOW()
        WHERE id = ${c.id}
      `
      replaced++
      console.log(
        `${label}\n  NEW    ${Math.round(c.before.density)}/${c.before.uniformity.toFixed(2)} -> ` +
        `${Math.round(after.density)}/${after.uniformity.toFixed(2)} (bytes-MP/flat)`,
      )
    } catch (err) {
      kept++
      console.log(`${label}\n  fail   ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      await page.close().catch(() => {})
    }
  }

  console.log(`\nReplaced ${replaced}, kept ${kept}, of ${work.length} attempted.`)
  process.exit(0)
}

main()

// app/api/cron/backfill/route.ts
// Vercel cron — runs daily at 3am UTC. Processes as many sites as fit in
// the 60s window, prioritising sites missing figma capture, then mobile.
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import {
  getBrowser,
  captureFullPageScreenshot,
  captureMobileScreenshot,
  captureFigmaLayers,
} from '@/lib/browser-extraction'

export const maxDuration = 60

const sql = neon(process.env.DATABASE_URL!)
const BUDGET_MS = 50_000 // stop queuing new sites after 50s, leave buffer for cleanup

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pending = await sql`
    SELECT id, source_url
    FROM design_sources
    WHERE figma_capture_url IS NULL
       OR mobile_screenshot_url IS NULL
    ORDER BY
      figma_capture_url IS NOT NULL,
      id ASC
    LIMIT 20
  `

  if (!pending.length) {
    return NextResponse.json({ done: true, message: 'All sites are up to date' })
  }

  const browser = await getBrowser()
  if (!browser) {
    return NextResponse.json({ error: 'Browser unavailable' }, { status: 500 })
  }

  const results: Array<{ id: number; ok: boolean; error?: string }> = []
  const start = Date.now()

  for (const { id, source_url } of pending) {
    if (Date.now() - start > BUDGET_MS) break

    const page = await browser.newPage()
    try {
      await page.setBypassCSP(true)
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
      await page.goto(source_url, { waitUntil: 'networkidle2', timeout: 15000 })
      await new Promise(r => setTimeout(r, 1500))

      const screenshotUrl = await captureFullPageScreenshot(page, source_url)
      const mobileScreenshotUrl = await captureMobileScreenshot(page, source_url)
      const figmaCaptureUrl = await captureFigmaLayers(page, source_url)

      await sql`
        UPDATE design_sources
        SET
          screenshot_url        = COALESCE(${screenshotUrl}, screenshot_url),
          mobile_screenshot_url = COALESCE(${mobileScreenshotUrl}, mobile_screenshot_url),
          figma_capture_url     = COALESCE(${figmaCaptureUrl}, figma_capture_url)
        WHERE id = ${id}
      `

      results.push({ id, ok: true })
    } catch (err) {
      console.error(`[cron/backfill] id=${id} failed:`, err)
      results.push({ id, ok: false, error: String(err) })
    } finally {
      await page.close()
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

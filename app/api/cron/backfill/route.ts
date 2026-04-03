// app/api/cron/backfill/route.ts
// Vercel cron — processes one site per invocation, prioritising sites that
// are missing screenshots or a Figma capture. Runs every 10 minutes.
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import {
  getBrowser,
  captureFullPageScreenshot,
  captureMobileScreenshot,
  captureFigmaLayers,
} from '@/lib/browser-extraction'

export const maxDuration = 300

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  // Verify this is a genuine Vercel cron invocation
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Pick the next site that needs work — missing figma first, then missing mobile
  const rows = await sql`
    SELECT id, source_url
    FROM design_sources
    WHERE figma_capture_url IS NULL
       OR mobile_screenshot_url IS NULL
    ORDER BY
      figma_capture_url IS NOT NULL,  -- sites without figma first
      id ASC
    LIMIT 1
  `

  if (!rows.length) {
    return NextResponse.json({ done: true, message: 'All sites are up to date' })
  }

  const { id, source_url } = rows[0]
  console.log(`[cron/backfill] Processing id=${id} url=${source_url}`)

  const browser = await getBrowser()
  if (!browser) {
    return NextResponse.json({ error: 'Browser unavailable' }, { status: 500 })
  }

  const page = await browser.newPage()
  try {
    await page.setBypassCSP(true)
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
    await page.goto(source_url, { waitUntil: 'networkidle2', timeout: 20000 })
    await new Promise(r => setTimeout(r, 2000))

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

    console.log(`[cron/backfill] Done id=${id} screenshot=${!!screenshotUrl} mobile=${!!mobileScreenshotUrl} figma=${!!figmaCaptureUrl}`)

    return NextResponse.json({
      id,
      url: source_url,
      screenshot: !!screenshotUrl,
      mobile: !!mobileScreenshotUrl,
      figma: !!figmaCaptureUrl,
    })
  } catch (err) {
    console.error(`[cron/backfill] Failed id=${id}:`, err)
    return NextResponse.json({ error: String(err), id }, { status: 500 })
  } finally {
    await page.close()
  }
}

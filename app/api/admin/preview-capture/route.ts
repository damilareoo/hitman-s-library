import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import type { Page } from 'puppeteer'
import { getBrowser, captureFullPageScreenshot } from '@/lib/browser-extraction'
import { requireAdmin } from '@/lib/admin-auth'

export const maxDuration = 60

const sql = neon(process.env.DATABASE_URL!)

async function storeExtractionError(id: string, error: string) {
  await sql`
    UPDATE design_sources
    SET metadata = COALESCE(metadata, '{}') || jsonb_build_object('extraction_error', ${error}::text)
    WHERE id = ${id}
  `
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sources = await sql`SELECT id, source_url FROM design_sources WHERE id = ${id}`
  if (!sources.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { source_url } = sources[0]
  const browser = await getBrowser()
  if (!browser) return NextResponse.json({ error: 'Browser unavailable' }, { status: 500 })

  let page: Page | null = null
  try {
    const activePage = await browser.newPage()
    page = activePage
    await activePage.setBypassCSP(true)
    await activePage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
    try {
      await activePage.goto(source_url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    } catch (navigationError) {
      console.warn('[preview-capture] navigation incomplete, attempting screenshot:', navigationError)
      if (activePage.url() === 'about:blank') throw navigationError
    }
    await new Promise(r => setTimeout(r, 2000))

    const screenshotUrl = await captureFullPageScreenshot(activePage, source_url)
    if (!screenshotUrl) {
      await storeExtractionError(id, 'Screenshot capture failed')
      return NextResponse.json({ ok: false, error: 'Screenshot capture failed' }, { status: 500 })
    }

    await sql`
      UPDATE design_sources
      SET
        screenshot_url = ${screenshotUrl},
        metadata = COALESCE(metadata, '{}') - 'extraction_error'
      WHERE id = ${id}
    `
    return NextResponse.json({ ok: true, screenshot_url: screenshotUrl })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[preview-capture]', err)
    try {
      await storeExtractionError(id, errorMessage)
    } catch (metadataError) {
      console.error('[preview-capture] failed to store extraction error:', metadataError)
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  } finally {
    await page?.close().catch(() => null)
  }
}

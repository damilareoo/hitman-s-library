import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import type { Page } from 'puppeteer'
import { getBrowser, captureMobileScreenshot } from '@/lib/browser-extraction'
import { requireAdmin } from '@/lib/admin-auth'

export const maxDuration = 60

const sql = neon(process.env.DATABASE_URL!)

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
    await activePage.setViewport({ width: 1440, height: 900 })
    try {
      await activePage.goto(source_url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    } catch (navigationError) {
      console.warn('[mobile-capture] navigation incomplete, attempting screenshot:', navigationError)
      if (activePage.url() === 'about:blank') throw navigationError
    }
    await new Promise(r => setTimeout(r, 2000))

    const mobileUrl = await captureMobileScreenshot(activePage, source_url)
    if (mobileUrl) {
      await sql`UPDATE design_sources SET mobile_screenshot_url = ${mobileUrl} WHERE id = ${id}`
    }
    return NextResponse.json({ ok: true, mobile_screenshot_url: mobileUrl })
  } catch (err) {
    console.error('[mobile-capture]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    await page?.close().catch(() => null)
  }
}

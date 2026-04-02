import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getBrowser, captureMobileScreenshot } from '@/lib/browser-extraction'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sources = await sql`SELECT id, source_url FROM design_sources WHERE id = ${id}`
  if (!sources.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { source_url } = sources[0]
  const browser = await getBrowser()
  if (!browser) return NextResponse.json({ error: 'Browser unavailable' }, { status: 500 })

  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 1440, height: 900 })
    await page.goto(source_url, { waitUntil: 'networkidle2', timeout: 15000 })
    await new Promise(r => setTimeout(r, 2000))

    const mobileUrl = await captureMobileScreenshot(page, source_url)
    if (mobileUrl) {
      await sql`UPDATE design_sources SET mobile_screenshot_url = ${mobileUrl} WHERE id = ${id}`
    }
    return NextResponse.json({ ok: true, mobile_screenshot_url: mobileUrl })
  } catch (err) {
    console.error('[mobile-capture]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    await page.close()
  }
}
